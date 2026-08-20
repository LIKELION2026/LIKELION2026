"""회의방 이름 생성 테스트.

Client가 만드는 이름과 같아야 한다. 어긋나도 아무 신호가 없고 자막만 안
뜨므로, 여기서 고정해두지 않으면 알아채기 어렵다.
"""

import re
from datetime import date
from pathlib import Path

import pytest

from translation_pipeline.rooms import (
    DEFAULT_SECTION,
    LAB_TEAM_SLUG,
    SECTION_SLUGS,
    UnknownMeetingSectionError,
    build_lab_room_name,
    is_lab_meeting_room,
)
from translation_pipeline.subtitle import validate_room_name

REPO_ROOT = Path(__file__).resolve().parents[3]
CLIENT_SECTION_FILE = (
    REPO_ROOT
    / "apps"
    / "client"
    / "src"
    / "features"
    / "realtime-meeting"
    / "model"
    / "meeting-room-section.ts"
)
SHARED_MEETING_FILE = REPO_ROOT / "packages" / "shared" / "src" / "domain" / "meeting.ts"


def test_the_name_matches_the_client_formula():
    # Client: `lab-${LAB_MEETING_TEAM_SLUG}-${yyyymmdd}-${roomSlug}`
    assert (
        build_lab_room_name("meeting-room", today=date(2026, 8, 17))
        == "lab-likelion-20260817-meeting-room"
    )


def test_the_default_section_is_the_meeting_room():
    # Client의 DEFAULT_MEETING_ROOM_SECTION_ID와 같다.
    assert DEFAULT_SECTION == "meeting-room"
    assert build_lab_room_name(today=date(2026, 8, 17)) == (
        "lab-likelion-20260817-meeting-room"
    )


@pytest.mark.parametrize(
    ("section", "expected"),
    [
        ("meeting-room", "lab-likelion-20260817-meeting-room"),
        ("meeting-room-1", "lab-likelion-20260817-meeting-room-1"),
        ("meeting-room-2", "lab-likelion-20260817-meeting-room-2"),
        ("meeting-room-3", "lab-likelion-20260817-meeting-room-3"),
    ],
)
def test_every_client_section_is_supported(section, expected):
    assert build_lab_room_name(section, today=date(2026, 8, 17)) == expected


@pytest.mark.parametrize("section", list(SECTION_SLUGS))
def test_every_generated_name_passes_the_server_regex(section):
    # 서버와 Client가 같은 정규식으로 막는다. 만든 이름이 걸리면 안 된다.
    name = build_lab_room_name(section, today=date(2026, 8, 17))

    assert validate_room_name(name) == name


def test_a_single_digit_date_is_zero_padded():
    assert build_lab_room_name(today=date(2026, 1, 5)) == (
        "lab-likelion-20260105-meeting-room"
    )


@pytest.mark.parametrize(
    "section", ["meeting", "office", "", "MEETING-ROOM", "korea-team-zone"]
)
def test_an_unknown_section_is_rejected(section):
    with pytest.raises(UnknownMeetingSectionError):
        build_lab_room_name(section)


def test_the_error_lists_the_known_sections():
    with pytest.raises(UnknownMeetingSectionError) as exc_info:
        build_lab_room_name("office")

    assert "meeting-room" in str(exc_info.value)


def test_today_is_used_when_no_date_is_given():
    # 로컬 날짜여야 한다. Client의 new Date()가 로컬이라 UTC로 만들면
    # 자정 부근에 하루가 어긋난다.
    expected = date.today().strftime("%Y%m%d")

    assert build_lab_room_name().startswith(f"lab-likelion-{expected}-")


# --- Shared/Client와 대조 ---
#
# 구역 표를 Shared에서 옮겨 적었으므로 양쪽이 어긋날 수 있다. 대신 Shared 파일을
# 읽어 대조한다. Client에는 날짜 기반 roomName 조합 공식만 남아 있으므로 함께 본다.
# 어긋나면 자막이 안 뜬 뒤에 찾는 대신 여기서 깨진다.


def read_client_source() -> str:
    # 건너뛰지 않고 실패시킨다. 파일이 옮겨졌다는 것 자체가 대조해야 할 변경이고,
    # 조용히 건너뛰면 이 테스트가 아무것도 지키지 않는 상태로 남는다.
    assert CLIENT_SECTION_FILE.exists(), (
        f"Client 파일을 찾을 수 없습니다: {CLIENT_SECTION_FILE}. "
        "옮겨졌다면 이 경로도 함께 고쳐야 합니다."
    )
    return CLIENT_SECTION_FILE.read_text(encoding="utf-8")


def read_shared_meeting_source() -> str:
    assert SHARED_MEETING_FILE.exists(), (
        f"Shared 회의 계약 파일을 찾을 수 없습니다: {SHARED_MEETING_FILE}. "
        "옮겨졌다면 이 경로도 함께 고쳐야 합니다."
    )
    return SHARED_MEETING_FILE.read_text(encoding="utf-8")


def test_the_team_slug_matches_the_client():
    source = read_client_source()

    match = re.search(r'LAB_MEETING_TEAM_SLUG\s*=\s*"([^"]+)"', source)
    assert match is not None, "Client에서 LAB_MEETING_TEAM_SLUG를 찾지 못했습니다"
    assert match.group(1) == LAB_TEAM_SLUG


def test_the_section_slugs_match_the_shared_contract():
    source = read_shared_meeting_source()

    # MEETING_ROOM_SECTION_METADATA의 각 항목: "<구역 id>": { ..., roomSlug: "<slug>" }
    pairs = re.findall(
        r'"([a-z0-9-]+)":\s*\{[^}]*?roomSlug:\s*"([a-z0-9-]+)"',
        source,
        re.DOTALL,
    )
    assert pairs, "Shared에서 roomSlug 표를 찾지 못했습니다"

    assert dict(pairs) == SECTION_SLUGS


def test_the_default_section_matches_the_shared_contract():
    source = read_shared_meeting_source()

    match = re.search(r'DEFAULT_MEETING_ROOM_SECTION_ID\s*=\s*"([^"]+)"', source)
    assert match is not None
    assert match.group(1) == DEFAULT_SECTION


def test_the_name_format_matches_the_client_template():
    source = read_client_source()

    # `lab-${LAB_MEETING_TEAM_SLUG}-${formatDateStamp(date)}-${roomSlug}`
    assert "lab-${LAB_MEETING_TEAM_SLUG}-${formatDateStamp(date)}-${roomSlug}" in source


# --- 회의방 판별 ---
#
# 에이전트는 방이 열리는 대로 배정받는다. 회의가 아닌 방까지 따라 들어가면
# 쓸데없이 인식·번역 호출을 태운다.


@pytest.mark.parametrize("section", list(SECTION_SLUGS))
def test_generated_rooms_are_recognized(section):
    assert is_lab_meeting_room(build_lab_room_name(section, today=date(2026, 8, 17)))


@pytest.mark.parametrize(
    "room_name",
    [
        "lab-likelion-20260817-office",
        "lab-other-20260817-meeting-room",
        "lab-likelion-2026817-meeting-room",
        "meeting-likelion-20260817-meeting-room",
        "lab-likelion-20260817-",
        "",
    ],
)
def test_other_rooms_are_rejected(room_name):
    assert is_lab_meeting_room(room_name) is False
