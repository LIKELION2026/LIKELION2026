"""지원 언어 상수와 get_target_lang 단위 테스트."""

import pytest

from translation_pipeline.errors import UnsupportedLanguageError
from translation_pipeline.languages import (
    LANGUAGE_NAMES,
    SUPPORTED_LANGUAGES,
    ensure_supported,
    get_target_lang,
    is_supported,
    language_name,
)


def test_supported_languages_are_exactly_ko_and_vi():
    # get_target_lang은 언어가 정확히 2개라는 전제 위에서만 동작한다.
    assert SUPPORTED_LANGUAGES == ("ko", "vi")


def test_language_names_cover_every_supported_language():
    assert set(LANGUAGE_NAMES) == set(SUPPORTED_LANGUAGES)


@pytest.mark.parametrize(
    ("source_lang", "expected_target"),
    [("ko", "vi"), ("vi", "ko")],
)
def test_get_target_lang_returns_the_other_language(source_lang, expected_target):
    assert get_target_lang(source_lang) == expected_target


@pytest.mark.parametrize("source_lang", SUPPORTED_LANGUAGES)
def test_get_target_lang_is_never_the_source_language(source_lang):
    assert get_target_lang(source_lang) != source_lang


@pytest.mark.parametrize("source_lang", SUPPORTED_LANGUAGES)
def test_get_target_lang_round_trips(source_lang):
    assert get_target_lang(get_target_lang(source_lang)) == source_lang


@pytest.mark.parametrize("language", ["en", "ja", "KO", "", "ko-KR"])
def test_get_target_lang_rejects_unsupported_language(language):
    with pytest.raises(UnsupportedLanguageError):
        get_target_lang(language)


def test_unsupported_language_error_reports_language_and_supported_list():
    with pytest.raises(UnsupportedLanguageError) as exc_info:
        get_target_lang("en")

    assert exc_info.value.language == "en"
    assert exc_info.value.supported == SUPPORTED_LANGUAGES


@pytest.mark.parametrize("language", SUPPORTED_LANGUAGES)
def test_is_supported_and_ensure_supported_accept_supported_languages(language):
    assert is_supported(language) is True
    assert ensure_supported(language) == language


def test_is_supported_rejects_unsupported_language():
    assert is_supported("en") is False


@pytest.mark.parametrize(
    ("language", "expected_name"),
    [("ko", "한국어"), ("vi", "베트남어")],
)
def test_language_name_returns_human_readable_name(language, expected_name):
    assert language_name(language) == expected_name
