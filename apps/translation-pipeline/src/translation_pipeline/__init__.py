"""한국어-베트남어 실시간 통역 파이프라인.

LiveKit 연동 전에 STT, 관용구 매칭, 번역 로직을 단독으로 검증하기 위한
패키지다.
"""

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
from .participants import ParticipantRegistry
from .pipeline import (
    DEFAULT_MAX_STALENESS_MS,
    TranslationPipeline,
    UtteranceResult,
)
from .publisher import SubtitlePublisher, SubtitlePublishError
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
    "ConversationContext",
    "ConversationTurn",
    "FakeTranslator",
    "Glossary",
    "GlossaryEntry",
    "GlossaryError",
    "GlossaryMatch",
    "DEFAULT_MAX_STALENESS_MS",
    "ParticipantRegistry",
    "SubtitleError",
    "SubtitlePayload",
    "SubtitlePublishError",
    "SubtitlePublisher",
    "TranslationError",
    "TranslationPipeline",
    "UtteranceResult",
    "build_subtitle",
    "utc_now_iso",
    "TranslationPipelineError",
    "TranslationRequest",
    "Translator",
    "UnknownParticipantError",
    "UnsupportedLanguageError",
    "build_system_prompt",
    "ensure_supported",
    "find_unapplied_entries",
    "get_target_lang",
    "is_supported",
    "language_name",
]
