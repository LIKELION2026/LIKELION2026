"""한국어-베트남어 실시간 통역 파이프라인.

LiveKit 연동 전에 STT, 관용구 매칭, 번역 로직을 단독으로 검증하기 위한
패키지다.
"""

from .agent import (
    ParticipantInfo,
    ParticipantWorker,
    TranslationAgent,
    read_participant,
)
from .context import DEFAULT_MAX_TURNS, ConversationContext, ConversationTurn
from .errors import (
    GlossaryError,
    TranslationError,
    TranslationPipelineError,
    UnknownParticipantError,
    UnsupportedLanguageError,
)
from .glossary import (
    DEFAULT_GLOSSARY_PATH,
    Glossary,
    GlossaryEntry,
    GlossaryMatch,
    find_unapplied_entries,
)
from .languages import (
    LANGUAGE_NAMES,
    SUPPORTED_LANGUAGES,
    ensure_supported,
    get_target_lang,
    is_supported,
    language_name,
)
from .livekit_room import ParticipantAudioRunner
from .participants import ParticipantRegistry
from .pipeline import (
    DEFAULT_MAX_STALENESS_MS,
    TranslationPipeline,
    UtteranceResult,
)
from .publisher import SubtitlePublisher, SubtitlePublishError
from .rooms import (
    DEFAULT_SECTION,
    is_lab_meeting_room,
    SECTION_SLUGS,
    UnknownMeetingSectionError,
    build_lab_room_name,
)
from .session import (
    DEFAULT_INTERIM_INTERVAL_MS,
    SessionEvent,
    TranslationSession,
)
from .stt import AudioSource, MicrophoneStream, RealtimeTranscriber, Utterance
from .subtitle import SubtitleError, SubtitlePayload, build_subtitle, utc_now_iso
from .translator import (
    FakeTranslator,
    TranslationRequest,
    Translator,
    build_system_prompt,
)

__all__ = [
    "DEFAULT_GLOSSARY_PATH",
    "DEFAULT_MAX_TURNS",
    "LANGUAGE_NAMES",
    "SUPPORTED_LANGUAGES",
    "AudioSource",
    "ConversationContext",
    "ConversationTurn",
    "FakeTranslator",
    "Glossary",
    "GlossaryEntry",
    "GlossaryError",
    "GlossaryMatch",
    "DEFAULT_INTERIM_INTERVAL_MS",
    "DEFAULT_SECTION",
    "DEFAULT_MAX_STALENESS_MS",
    "MicrophoneStream",
    "ParticipantAudioRunner",
    "ParticipantInfo",
    "ParticipantRegistry",
    "ParticipantWorker",
    "RealtimeTranscriber",
    "SubtitleError",
    "SubtitlePayload",
    "SubtitlePublishError",
    "SECTION_SLUGS",
    "SessionEvent",
    "SubtitlePublisher",
    "TranslationAgent",
    "TranslationError",
    "TranslationPipeline",
    "TranslationSession",
    "UtteranceResult",
    "build_lab_room_name",
    "is_lab_meeting_room",
    "read_participant",
    "build_subtitle",
    "utc_now_iso",
    "TranslationPipelineError",
    "TranslationRequest",
    "Translator",
    "Utterance",
    "UnknownMeetingSectionError",
    "UnknownParticipantError",
    "UnsupportedLanguageError",
    "build_system_prompt",
    "ensure_supported",
    "find_unapplied_entries",
    "get_target_lang",
    "is_supported",
    "language_name",
]
