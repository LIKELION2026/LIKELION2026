"""회의방 이름 생성.

Client는 방 이름을 오늘 날짜로 만든다. 파이프라인이 그 이름을 손으로 받으면
날짜가 바뀔 때마다 어긋나고, 어긋나도 아무 신호가 없다. 이름 형식은 유효하니
검증을 통과하고 서버 발행도 성공한다. 회의 화면에만 자막이 안 뜬다.

그래서 같은 공식을 여기에도 둔다.

    packages/shared/src/domain/meeting.ts

slug 표는 위 파일을 옮겨 적은 것이라 양쪽이 어긋날 수 있다. Python 런타임이
TypeScript 패키지를 직접 import하지 못해서 테스트로 shared 선언과 대조한다.
"""

import re
from datetime import date

from .errors import TranslationPipelineError

# Client의 LAB_MEETING_TEAM_SLUG와 같아야 한다.
LAB_TEAM_SLUG = "likelion"

# Shared의 MEETING_ROOM_SECTION_METADATA에서 roomSlug만 옮긴 것이다.
SECTION_SLUGS: dict[str, str] = {
    "meeting-room": "meeting-room",
    "meeting-room-1": "meeting-room-1",
    "meeting-room-2": "meeting-room-2",
    "meeting-room-3": "meeting-room-3",
}

DEFAULT_SECTION = "meeting-room"


class UnknownMeetingSectionError(TranslationPipelineError):
    """Client에 없는 구역 이름을 받았을 때 발생한다."""


_LAB_ROOM_PATTERN = re.compile(
    rf"^lab-{re.escape(LAB_TEAM_SLUG)}-\d{{8}}-(?P<slug>[a-z][a-z0-9_-]*)$"
)


def is_lab_meeting_room(room_name: str) -> bool:
    """통역이 들어가야 할 회의방인지 판단한다.

    에이전트는 방이 열리는 대로 배정받으므로, 회의가 아닌 방까지 따라 들어가면
    쓸데없이 인식·번역 호출을 태운다. 우리 팀 회의방만 받는다.
    """
    match = _LAB_ROOM_PATTERN.match(room_name or "")
    return bool(match) and match.group("slug") in set(SECTION_SLUGS.values())


def build_lab_room_name(
    section: str = DEFAULT_SECTION, today: date | None = None
) -> str:
    """Client와 같은 규칙으로 오늘의 회의방 이름을 만든다.

    날짜는 로컬 기준이다. Client의 ``new Date()``가 로컬 시각이므로 UTC로
    만들면 자정 부근에 하루가 어긋난다.
    """
    slug = SECTION_SLUGS.get(section)
    if slug is None:
        known = ", ".join(sorted(SECTION_SLUGS))
        raise UnknownMeetingSectionError(
            f"모르는 회의 구역입니다: {section!r}. 가능한 값: {known}"
        )

    stamp = (today if today is not None else date.today()).strftime("%Y%m%d")
    return f"lab-{LAB_TEAM_SLUG}-{stamp}-{slug}"
