"""자막 페이로드 테스트.

필드 이름과 형식은 `packages/shared/src/contracts/socket/subtitle.ts` 계약을
따른다. 여기서 어긋나면 서버가 거절하거나 Client가 자막을 못 읽는다.
"""

import re

import pytest

from translation_pipeline.subtitle import (
    SubtitleError,
    build_subtitle,
    utc_now_iso,
    validate_room_name,
)

VALID_ROOM = "lab-ai-20260816-demo"


def make(**overrides):
    values = {
        "subtitle_id": "sub1",
        "room_name": VALID_ROOM,
        "speaker_identity": "user_ko",
        "speaker_display_name": "민수",
        "source_lang": "ko",
        "source_text": "고생하셨습니다",
        "target_lang": "vi",
        "translated_text": "Cảm ơn.",
    }
    values.update(overrides)
    return build_subtitle(**values)


def test_payload_uses_the_contract_field_names():
    payload = make().to_dict()

    assert set(payload) == {
        "subtitleId",
        "roomName",
        "speaker",
        "sourceLanguage",
        "sourceText",
        "translatedLanguage",
        "translatedText",
        "occurredAt",
        "isFinal",
        "revision",
    }


def test_speaker_is_nested():
    speaker = make().to_dict()["speaker"]

    assert speaker == {"participantIdentity": "user_ko", "displayName": "민수"}


def test_confidence_is_omitted_when_absent():
    assert "confidence" not in make().to_dict()


def test_confidence_is_included_when_given():
    assert make(confidence=0.9).to_dict()["confidence"] == 0.9


def test_defaults_to_a_final_first_revision():
    payload = make().to_dict()

    assert payload["isFinal"] is True
    assert payload["revision"] == 1


def test_occurred_at_is_iso8601():
    occurred_at = make().to_dict()["occurredAt"]

    # 서버가 IsISO8601(strict)로 검증한다.
    assert re.match(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}", occurred_at)


def test_utc_now_is_timezone_aware():
    assert utc_now_iso().endswith("+00:00")


@pytest.mark.parametrize(
    "room_name",
    [
        "demo",
        "lab-ai-demo",
        "lab-ai-2026816-demo",
        "meeting-ai-20260816-demo",
        "",
    ],
)
def test_invalid_room_name_is_rejected(room_name):
    # 서버가 같은 정규식으로 막는다. 보내기 전에 여기서 잡아야 원인을 안다.
    with pytest.raises(SubtitleError):
        validate_room_name(room_name)


def test_valid_room_name_passes():
    assert validate_room_name(VALID_ROOM) == VALID_ROOM


@pytest.mark.parametrize("identity", ["user ko", "user.ko", "-user", "", "한글"])
def test_invalid_participant_identity_is_rejected(identity):
    with pytest.raises(SubtitleError):
        make(speaker_identity=identity)


def test_invalid_subtitle_id_is_rejected():
    with pytest.raises(SubtitleError):
        make(subtitle_id="has space")


@pytest.mark.parametrize("text", ["", "   "])
def test_blank_source_text_is_rejected(text):
    with pytest.raises(SubtitleError):
        make(source_text=text)


@pytest.mark.parametrize("text", ["", "   "])
def test_blank_translated_text_is_rejected(text):
    with pytest.raises(SubtitleError):
        make(translated_text=text)


def test_revision_below_one_is_rejected():
    with pytest.raises(SubtitleError):
        make(revision=0)


def test_display_name_falls_back_to_identity():
    payload = make(speaker_display_name="").to_dict()

    assert payload["speaker"]["displayName"] == "user_ko"


def test_display_name_is_truncated_to_the_contract_limit():
    payload = make(speaker_display_name="가" * 100).to_dict()

    # 서버가 Length(1, 64)로 검증한다.
    assert len(payload["speaker"]["displayName"]) == 64


def test_long_text_is_truncated_to_the_contract_limit():
    payload = make(source_text="가" * 3000).to_dict()

    assert len(payload["sourceText"]) == 2_000
