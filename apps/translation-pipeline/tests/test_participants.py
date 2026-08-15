"""참가자-언어 매핑 단위 테스트.

참가자 수가 2명이든 5명이든 10명이든, 타겟 언어는 화자의 언어만으로
결정되어야 한다.
"""

import pytest

from translation_pipeline.errors import (
    UnknownParticipantError,
    UnsupportedLanguageError,
)
from translation_pipeline.languages import SUPPORTED_LANGUAGES
from translation_pipeline.participants import ParticipantRegistry

# 한 명은 한국어, 한 명은 베트남어를 선택한 최소 회의.
TWO_PARTICIPANTS = {
    "user_abc123": "ko",
    "user_xyz789": "vi",
}

# 한국어 2명, 베트남어 3명이 섞인 회의.
FIVE_PARTICIPANTS = {
    "user_ko_1": "ko",
    "user_ko_2": "ko",
    "user_vi_1": "vi",
    "user_vi_2": "vi",
    "user_vi_3": "vi",
}


def test_registry_starts_empty():
    registry = ParticipantRegistry()

    assert len(registry) == 0
    assert registry.participant_languages == {}


def test_registry_accepts_initial_mapping():
    registry = ParticipantRegistry(TWO_PARTICIPANTS)

    assert len(registry) == 2
    assert registry.participant_languages == TWO_PARTICIPANTS


def test_two_participants_translate_to_each_other():
    registry = ParticipantRegistry(TWO_PARTICIPANTS)

    assert registry.resolve_direction("user_abc123") == ("ko", "vi")
    assert registry.resolve_direction("user_xyz789") == ("vi", "ko")


def test_five_participants_resolve_direction_from_speaker_language_only():
    registry = ParticipantRegistry(FIVE_PARTICIPANTS)

    # 베트남어 화자가 3명으로 더 많아도 한국어 화자의 타겟은 베트남어 하나다.
    assert registry.resolve_direction("user_ko_1") == ("ko", "vi")
    assert registry.resolve_direction("user_ko_2") == ("ko", "vi")

    assert registry.resolve_direction("user_vi_1") == ("vi", "ko")
    assert registry.resolve_direction("user_vi_2") == ("vi", "ko")
    assert registry.resolve_direction("user_vi_3") == ("vi", "ko")


@pytest.mark.parametrize("participant_count", [2, 3, 5, 10, 25])
def test_direction_does_not_depend_on_participant_count(participant_count):
    registry = ParticipantRegistry()
    for index in range(participant_count):
        # 참가자를 늘리면서 두 언어를 번갈아 배정한다.
        language = SUPPORTED_LANGUAGES[index % len(SUPPORTED_LANGUAGES)]
        registry.set_language(f"user_{index}", language)

    assert len(registry) == participant_count

    for participant_id, language in registry.participant_languages.items():
        source_lang, target_lang = registry.resolve_direction(participant_id)

        assert source_lang == language
        assert target_lang != source_lang
        assert target_lang in SUPPORTED_LANGUAGES


def test_participants_can_be_added_at_runtime():
    registry = ParticipantRegistry(TWO_PARTICIPANTS)

    registry.set_language("user_def456", "vi")

    assert len(registry) == 3
    assert registry.resolve_direction("user_def456") == ("vi", "ko")


def test_participant_can_change_selected_language():
    registry = ParticipantRegistry({"user_abc123": "ko"})

    registry.set_language("user_abc123", "vi")

    assert len(registry) == 1
    assert registry.resolve_direction("user_abc123") == ("vi", "ko")


def test_removed_participant_is_no_longer_registered():
    registry = ParticipantRegistry(TWO_PARTICIPANTS)

    registry.remove("user_abc123")

    assert len(registry) == 1
    assert "user_abc123" not in registry
    with pytest.raises(UnknownParticipantError):
        registry.resolve_direction("user_abc123")


def test_removing_unknown_participant_is_ignored():
    registry = ParticipantRegistry(TWO_PARTICIPANTS)

    registry.remove("user_never_joined")

    assert len(registry) == 2


def test_language_of_rejects_unknown_participant():
    registry = ParticipantRegistry(TWO_PARTICIPANTS)

    with pytest.raises(UnknownParticipantError) as exc_info:
        registry.language_of("user_never_joined")

    assert exc_info.value.participant_id == "user_never_joined"


@pytest.mark.parametrize("language", ["en", "ja", "KO", ""])
def test_set_language_rejects_unsupported_language(language):
    registry = ParticipantRegistry()

    with pytest.raises(UnsupportedLanguageError):
        registry.set_language("user_abc123", language)

    assert len(registry) == 0


def test_constructor_rejects_unsupported_language():
    with pytest.raises(UnsupportedLanguageError):
        ParticipantRegistry({"user_abc123": "ko", "user_xyz789": "en"})


def test_set_language_rejects_empty_participant_id():
    registry = ParticipantRegistry()

    with pytest.raises(ValueError):
        registry.set_language("", "ko")


def test_participant_languages_returns_a_copy():
    registry = ParticipantRegistry(TWO_PARTICIPANTS)

    snapshot = registry.participant_languages
    snapshot["user_hacked"] = "vi"

    assert "user_hacked" not in registry
    assert len(registry) == 2
