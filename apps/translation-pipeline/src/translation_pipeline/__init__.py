"""한국어-베트남어 실시간 통역 파이프라인.

LiveKit 연동 전에 STT, 관용구 매칭, 번역 로직을 단독으로 검증하기 위한
패키지다.
"""

from .errors import (
    TranslationPipelineError,
    UnknownParticipantError,
    UnsupportedLanguageError,
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

__all__ = [
    "LANGUAGE_NAMES",
    "SUPPORTED_LANGUAGES",
    "ParticipantRegistry",
    "TranslationPipelineError",
    "UnknownParticipantError",
    "UnsupportedLanguageError",
    "ensure_supported",
    "get_target_lang",
    "is_supported",
    "language_name",
]
