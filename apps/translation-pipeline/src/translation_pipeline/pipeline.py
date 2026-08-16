"""발화 하나를 자막 하나로 만드는 조립 계층.

    발화 -> 화자 언어 조회 -> 사전 매칭 -> 번역 -> 자막 페이로드

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

# 발화가 끝나고 이 시간을 넘겨 도착한 번역은 버린다. 늦게 뜬 자막은 이후
# 발화와 순서가 엉켜 대화를 방해하므로, 없는 편이 낫다.
DEFAULT_MAX_STALENESS_MS = 5_000


@dataclass(frozen=True)
class UtteranceResult:
    """발화 하나를 처리한 결과.

    ``subtitle``이 None이면 발행하지 않는다. 이유는 ``skip_reason``에 담긴다.
    """

    subtitle: SubtitlePayload | None
    elapsed_ms: int
    used_glossary: bool = False
    used_translation_model: bool = False
    skip_reason: str | None = None
    unapplied_glossary_count: int = 0


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

    @property
    def room_name(self) -> str:
        return self._room_name

    @property
    def context(self) -> ConversationContext:
        return self._context

    def handle_utterance(
        self, speaker_id: str, text: str, spoken_at: float | None = None
    ) -> UtteranceResult:
        """발화 하나를 자막으로 만든다.

        ``spoken_at``은 발화가 끝난 시각(``time.monotonic()`` 기준)이다. 번역이
        끝난 뒤 이 시각과 비교해 너무 늦었으면 자막을 만들지 않는다.
        """
        started = spoken_at if spoken_at is not None else time.monotonic()
        occurred_at = utc_now_iso()

        source_lang, target_lang = self._participants.resolve_direction(speaker_id)
        display_name = self._participants.display_name_of(speaker_id)

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

        # 사전만으로 끝난 경우는 지연이 사실상 없으므로 폐기 판단을 하지 않는다.
        if used_model and elapsed_ms > self._max_staleness_ms:
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
            subtitle_id=uuid.uuid4().hex,
            room_name=self._room_name,
            speaker_identity=speaker_id,
            speaker_display_name=display_name,
            source_lang=source_lang,
            source_text=text,
            target_lang=target_lang,
            translated_text=translated,
            occurred_at=occurred_at,
        )

        # 버린 번역은 맥락에 남기지 않는다. 발행되지 않은 문장이 이후 번역의
        # 선례가 되면 화면에 없는 내용을 기준으로 번역하게 된다.
        self._context.add(speaker_id, text, translated)

        return UtteranceResult(
            subtitle=subtitle,
            elapsed_ms=elapsed_ms,
            used_glossary=used_glossary,
            used_translation_model=used_model,
            unapplied_glossary_count=unapplied,
        )
