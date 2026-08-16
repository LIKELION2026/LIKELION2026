"""지원 언어 상수와 타겟 언어 결정 로직.

지원 언어는 한국어와 베트남어 2개로 고정한다. 언어가 2개뿐이므로 화자의
언어만 알면 타겟 언어는 나머지 한 언어로 정해지며, 회의 참가자가 몇 명이든
결과가 달라지지 않는다.
"""

from .errors import UnsupportedLanguageError

# 지원 언어는 정확히 2개로 고정한다. 실수로 항목이 늘어나면
# get_target_lang이 어떤 언어를 골라야 할지 결정할 수 없으므로,
# 변경을 막기 위해 tuple로 둔다.
SUPPORTED_LANGUAGES: tuple[str, ...] = ("ko", "vi")

# 시스템 프롬프트에 넣을 사람이 읽는 언어 이름.
LANGUAGE_NAMES: dict[str, str] = {
    "ko": "한국어",
    "vi": "베트남어",
}


def is_supported(language: str) -> bool:
    """지원 언어인지 확인한다."""
    return language in SUPPORTED_LANGUAGES


def ensure_supported(language: str) -> str:
    """지원 언어면 그대로 반환하고, 아니면 UnsupportedLanguageError를 던진다."""
    if not is_supported(language):
        raise UnsupportedLanguageError(language, SUPPORTED_LANGUAGES)
    return language


def get_target_lang(source_lang: str) -> str:
    """화자 언어를 받아 번역할 타겟 언어를 반환한다.

    참가자 수와 무관하게 동작하므로 참가자-언어 매핑을 조회하지 않는다.
    화자 언어 자체는 ParticipantRegistry에서 따로 조회한다.
    """
    ensure_supported(source_lang)

    others = [language for language in SUPPORTED_LANGUAGES if language != source_lang]
    if len(others) != 1:
        # 지원 언어가 2개라는 전제가 깨지면 조용히 잘못된 언어를 고르는 대신
        # 즉시 실패시킨다.
        raise RuntimeError(
            "get_target_lang은 지원 언어가 정확히 2개일 때만 동작합니다. "
            f"현재 SUPPORTED_LANGUAGES={SUPPORTED_LANGUAGES}"
        )
    return others[0]


def language_name(language: str) -> str:
    """지원 언어의 사람이 읽는 이름을 반환한다."""
    ensure_supported(language)
    return LANGUAGE_NAMES[language]
