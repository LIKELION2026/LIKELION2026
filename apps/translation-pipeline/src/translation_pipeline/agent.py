"""회의방 참가자 전원을 한 프로세스에서 통역하는 에이전트.

참가자마다 인식 세션을 하나씩 띄운다. 참가자가 들어오면 만들고 나가면
정리한다. 통역에 필요한 정보는 LiveKit 참가자에 이미 실려 있다.

    identity          -> 자막의 participantIdentity
    name              -> 자막에 표시할 이름
    preferredLanguage -> 번역 방향

`apps/server`가 토큰을 만들 때 넣어준 값이다. 그래서 Client도 Server도 고칠
것이 없다.

참가자마다 파이프라인을 따로 둔다. 하나를 공유하면 번역 호출에 락이 걸려 두
사람이 동시에 말할 때 순서를 기다린다. 각자 프로세스로 돌리던 종전과 동작이
같다.
"""

import threading
from dataclasses import dataclass
from typing import Callable

from .errors import TranslationPipelineError
from .languages import is_supported
from .livekit_audio import LiveKitAudioSource
from .participants import ParticipantRegistry
from .pipeline import TranslationPipeline
from .publisher import SubtitlePublisher
from .session import (
    DEFAULT_FINALIZE_AFTER_MS,
    DEFAULT_INTERIM_INTERVAL_MS,
    TranslationSession,
)
from .stt import DEFAULT_ENDPOINTING_MS, RealtimeTranscriber, Utterance
from .translator import Translator

# LiveKit 참가자 attributes의 키. apps/server의 meeting.service.ts가 넣는다.
LANGUAGE_ATTRIBUTE = "preferredLanguage"
COUNTRY_ATTRIBUTE = "participantCountry"

# packages/shared의 MEETING_PARTICIPANT_LANGUAGE_BY_COUNTRY와 같아야 한다.
# preferredLanguage가 없는 참가자를 위한 대비책이다.
LANGUAGE_BY_COUNTRY: dict[str, str] = {"kr": "ko", "vn": "vi"}


@dataclass(frozen=True)
class ParticipantInfo:
    """통역에 필요한 참가자 정보."""

    identity: str
    display_name: str
    language: str


def read_participant(participant) -> ParticipantInfo | None:
    """LiveKit 참가자에서 통역에 필요한 것만 읽는다.

    언어를 알 수 없으면 ``None``을 돌려준다. 우리 토큰 API를 거치지 않고
    들어온 참가자나 에이전트 자신이 여기 해당한다. 통역 대상이 아니다.
    """
    identity = (getattr(participant, "identity", "") or "").strip()
    if not identity:
        return None

    attributes = getattr(participant, "attributes", None) or {}
    language = (attributes.get(LANGUAGE_ATTRIBUTE) or "").strip()
    if not language:
        country = (attributes.get(COUNTRY_ATTRIBUTE) or "").strip()
        language = LANGUAGE_BY_COUNTRY.get(country, "")
    if not is_supported(language):
        return None

    display_name = (getattr(participant, "name", "") or "").strip() or identity
    return ParticipantInfo(
        identity=identity, display_name=display_name, language=language
    )


class ParticipantWorker:
    """참가자 한 명의 오디오를 자막까지 옮기는 단위.

    인식은 블로킹이라 스레드에서 돈다. 오디오는 ``audio``에 밀어 넣으면 된다.
    """

    def __init__(
        self,
        info: ParticipantInfo,
        room_name: str,
        translator: Translator,
        publisher: SubtitlePublisher | None = None,
        endpointing_ms: int = DEFAULT_ENDPOINTING_MS,
        interim_interval_ms: int = DEFAULT_INTERIM_INTERVAL_MS,
        finalize_after_ms: int = DEFAULT_FINALIZE_AFTER_MS,
        on_event=None,
    ) -> None:
        self.info = info
        self.audio = LiveKitAudioSource()

        participants = ParticipantRegistry()
        participants.set_language(
            info.identity, info.language, display_name=info.display_name
        )
        pipeline = TranslationPipeline(
            room_name=room_name,
            participants=participants,
            translator=translator,
        )
        self.session = TranslationSession(
            pipeline=pipeline,
            speaker_id=info.identity,
            publisher=publisher,
            interim_interval_ms=interim_interval_ms,
            finalize_after_ms=finalize_after_ms,
            on_event=on_event,
        )
        self.transcriber = RealtimeTranscriber(
            language=info.language,
            endpointing_ms=endpointing_ms,
            audio_source=self.audio,
        )
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if self._thread is not None:
            raise RuntimeError("이미 시작된 참가자입니다.")
        self.session.start()
        self._thread = threading.Thread(target=self._listen, daemon=True)
        self._thread.start()

    def _listen(self) -> None:
        def on_utterance(utterance: Utterance) -> None:
            self.session.submit_utterance(
                utterance.text, ends_utterance=utterance.ends_utterance
            )

        try:
            self.transcriber.run(
                on_utterance=on_utterance, on_interim=self.session.submit_interim
            )
        except TranslationPipelineError:
            # 한 참가자의 인식이 끊겨도 나머지는 계속 통역해야 한다.
            return

    def stop(self, timeout: float = 10.0) -> None:
        """오디오를 닫고 남은 번역까지 끝낸 뒤 정리한다."""
        self.transcriber.stop()
        self.audio.close()
        if self._thread is not None:
            self._thread.join(timeout=timeout)
            self._thread = None
        self.session.stop(timeout=timeout)


class TranslationAgent:
    """회의방 하나에서 참가자별 통역을 관리한다."""

    def __init__(
        self,
        room_name: str,
        translator_factory: Callable[[], Translator],
        publisher: SubtitlePublisher | None = None,
        endpointing_ms: int = DEFAULT_ENDPOINTING_MS,
        interim_interval_ms: int = DEFAULT_INTERIM_INTERVAL_MS,
        finalize_after_ms: int = DEFAULT_FINALIZE_AFTER_MS,
        on_event=None,
        worker_factory: Callable[..., ParticipantWorker] | None = None,
    ) -> None:
        self._room_name = room_name
        self._translator_factory = translator_factory
        self._publisher = publisher
        self._endpointing_ms = endpointing_ms
        self._interim_interval_ms = interim_interval_ms
        self._finalize_after_ms = finalize_after_ms
        self._on_event = on_event
        self._worker_factory = worker_factory or ParticipantWorker
        self._workers: dict[str, ParticipantWorker] = {}

    @property
    def room_name(self) -> str:
        return self._room_name

    def workers(self) -> dict[str, ParticipantWorker]:
        return dict(self._workers)

    def add_participant(self, participant) -> ParticipantWorker | None:
        """참가자를 통역 대상으로 받는다. 대상이 아니면 ``None``."""
        info = read_participant(participant)
        if info is None:
            return None
        if info.identity in self._workers:
            return self._workers[info.identity]

        worker = self._worker_factory(
            info=info,
            room_name=self._room_name,
            translator=self._translator_factory(),
            publisher=self._publisher,
            endpointing_ms=self._endpointing_ms,
            interim_interval_ms=self._interim_interval_ms,
            finalize_after_ms=self._finalize_after_ms,
            on_event=self._on_event,
        )
        self._workers[info.identity] = worker
        worker.start()
        return worker

    def remove_participant(self, identity: str) -> None:
        """참가자가 나갔다. 스레드와 큐를 정리한다."""
        worker = self._workers.pop(identity, None)
        if worker is not None:
            worker.stop()

    def stop(self) -> None:
        for identity in list(self._workers):
            self.remove_participant(identity)
