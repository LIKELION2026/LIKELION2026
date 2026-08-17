"""발화 하나를 자막 하나로 만드는 조립 계층.

    발화 조각 -> 화자 언어 조회 -> 사전 매칭 -> 번역 -> 자막 페이로드

Deepgram은 발화를 겹치지 않는 조각으로 나눠 확정한다. 조각이 확정될 때마다
그때까지 쌓인 전체를 번역해 같은 ``subtitleId``로 ``revision``을 올려 보낸다.
Client는 ``subtitleId``가 같으면 ``revision``이 높은 것으로 교체하므로,
시청자에게는 자막이 자라면서 정확해지는 것으로 보인다. 발화가 끝나기를
기다리지 않으므로 첫 자막이 그만큼 빨리 뜬다.

여기가 발화 시각을 아는 유일한 계층이다. 번역 provider는 언제 말한 것인지
모르고, Gemini는 timeout 하한 10초를 강제한다. 그래서 "너무 늦게 온 번역을
버린다"는 판단은 이 계층에서만 할 수 있다.
"""

import time
import uuid
from dataclasses import dataclass

from .context import ConversationContext
from .glossary import Glossary, find_unapplied_entries
from .participants import ParticipantRegistry
from .subtitle import SubtitlePayload, build_subtitle, utc_now_iso, validate_room_name
from .translator import TranslationRequest, Translator

# 발화가 끝나고 이 시간을 넘겨 도착한 번역은 버린다. Client가 occurredAt 순으로
# 정렬하므로 늦게 도착해도 자막 순서는 엉키지 않는다. 그래서 이 값은 대화를
# 지키는 규칙이 아니라, 응답이 비정상적으로 늦어질 때를 막는 안전장치다.
DEFAULT_MAX_STALENESS_MS = 15_000


@dataclass(frozen=True)
class UtteranceResult:
    """발화 조각 하나를 처리한 결과.

    ``subtitle``이 None이면 발행하지 않는다. 이유는 ``skip_reason``에 담긴다.
    """

    subtitle: SubtitlePayload | None
    elapsed_ms: int
    used_glossary: bool = False
    used_translation_model: bool = False
    skip_reason: str | None = None
    unapplied_glossary_count: int = 0


@dataclass
class _OpenUtterance:
    """아직 끝나지 않은 발화. 조각이 올 때마다 갱신된다.

    ``subtitle_id``와 ``occurred_at``은 발화 내내 고정한다. 그래야 Client가
    같은 자막으로 알아보고 덮어쓴다.
    """

    subtitle_id: str
    occurred_at: str
    segments: list[str]
    revision: int = 0

    @property
    def text(self) -> str:
        return " ".join(self.segments)


class TranslationPipeline:
    """참가자 정보와 사전, 번역기를 묶어 자막을 만든다."""

    def __init__(
        self,
        room_name: str,
        participants: ParticipantRegistry,
        translator: Translator,
        glossary: Glossary | None = None,
        context: ConversationContext | None = None,
        max_staleness_ms: int = DEFAULT_MAX_STALENESS_MS,
    ) -> None:
        self._room_name = validate_room_name(room_name)
        self._participants = participants
        self._translator = translator
        self._glossary = glossary if glossary is not None else Glossary.load()
        self._context = context if context is not None else ConversationContext()
        self._max_staleness_ms = max_staleness_ms
        # 화자별로 진행 중인 발화. 발화가 끝나면 지운다.
        self._open: dict[str, _OpenUtterance] = {}

    @property
    def room_name(self) -> str:
        return self._room_name

    @property
    def context(self) -> ConversationContext:
        return self._context

    def handle_utterance(
        self,
        speaker_id: str,
        text: str,
        spoken_at: float | None = None,
        ends_utterance: bool = True,
    ) -> UtteranceResult:
        """발화 조각 하나를 자막으로 만든다.

        ``text``는 이번에 확정된 조각이고, 번역 대상은 그때까지 쌓인 전체다.
        ``ends_utterance``가 False면 뒤에 조각이 더 오므로 발화를 열어 둔 채
        같은 ``subtitleId``로 ``revision``만 올린다.

        ``spoken_at``은 조각이 확정된 시각(``time.monotonic()`` 기준)이다.
        번역이 끝난 뒤 이 시각과 비교해 너무 늦었으면 자막을 만들지 않는다.
        """
        started = spoken_at if spoken_at is not None else time.monotonic()

        source_lang, target_lang = self._participants.resolve_direction(speaker_id)
        display_name = self._participants.display_name_of(speaker_id)

        open_utterance = self._open.get(speaker_id)
        if open_utterance is None:
            open_utterance = _OpenUtterance(
                subtitle_id=uuid.uuid4().hex,
                occurred_at=utc_now_iso(),
                segments=[],
            )
            self._open[speaker_id] = open_utterance

        open_utterance.segments.append(text.strip())
        open_utterance.revision += 1
        # 발화가 끝나면 다음 조각은 새 자막이다. 번역이 실패하거나 늦어
        # 중간에 빠져나가도 상태는 남지 않도록 여기서 미리 닫는다.
        if ends_utterance:
            self._open.pop(speaker_id, None)

        text = open_utterance.text
        occurred_at = open_utterance.occurred_at

        match = self._glossary.match(text, source_lang, target_lang)
        used_glossary = bool(match.entries)
        unapplied = 0

        if match.can_skip_translation_model:
            translated = match.direct_translation
            used_model = False
        else:
            translated = self._translator.translate(
                TranslationRequest(
                    text=text,
                    source_lang=source_lang,
                    target_lang=target_lang,
                    glossary_entries=match.entries,
                    context_turns=self._context.recent(),
                )
            )
            used_model = True
            if match.entries:
                unapplied = len(find_unapplied_entries(translated, match.entries))

        elapsed_ms = int((time.monotonic() - started) * 1000)

        # 중간 조각은 늦어도 버리지 않는다. 늦게 도착하면 Client가 revision으로
        # 걸러내고, 버려봐야 다음 조각이 어차피 전체를 다시 번역한다. 이미 쓴
        # 호출의 결과만 잃는다. 버렸을 때 실제로 손해가 나는 쪽은 마지막
        # 조각뿐이다. 그때만 미완성 번역이 화면에 남거나, 조각이 하나뿐이었다면
        # 자막이 아예 뜨지 않는다.
        #
        # 사전만으로 끝난 경우는 지연이 사실상 없으므로 폐기 판단을 하지 않는다.
        if ends_utterance and used_model and elapsed_ms > self._max_staleness_ms:
            return UtteranceResult(
                subtitle=None,
                elapsed_ms=elapsed_ms,
                used_glossary=used_glossary,
                used_translation_model=used_model,
                skip_reason=(
                    f"번역이 {elapsed_ms}ms 걸려 "
                    f"{self._max_staleness_ms}ms 기준을 넘겼습니다"
                ),
                unapplied_glossary_count=unapplied,
            )

        subtitle = build_subtitle(
            subtitle_id=open_utterance.subtitle_id,
            room_name=self._room_name,
            speaker_identity=speaker_id,
            speaker_display_name=display_name,
            source_lang=source_lang,
            source_text=text,
            target_lang=target_lang,
            translated_text=translated,
            occurred_at=occurred_at,
            is_final=ends_utterance,
            revision=open_utterance.revision,
        )

        # 버린 번역은 맥락에 남기지 않는다. 발행되지 않은 문장이 이후 번역의
        # 선례가 되면 화면에 없는 내용을 기준으로 번역하게 된다.
        # 중간 조각도 남기지 않는다. 곧 전체 문장으로 덮어써질 미완성 번역이
        # 맥락에 끼면 같은 말이 두 번 들어간 것처럼 보인다.
        if ends_utterance:
            self._context.add(speaker_id, text, translated)

        return UtteranceResult(
            subtitle=subtitle,
            elapsed_ms=elapsed_ms,
            used_glossary=used_glossary,
            used_translation_model=used_model,
            unapplied_glossary_count=unapplied,
        )
