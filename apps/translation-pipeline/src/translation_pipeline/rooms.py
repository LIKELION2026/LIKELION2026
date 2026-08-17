"""회의방 이름 생성.

Client는 방 이름을 오늘 날짜로 만든다. 파이프라인이 그 이름을 손으로 받으면
날짜가 바뀔 때마다 어긋나고, 어긋나도 아무 신호가 없다. 이름 형식은 유효하니
검증을 통과하고 서버 발행도 성공한다. 회의 화면에만 자막이 안 뜬다.

그래서 같은 공식을 여기에도 둔다.

    apps/client/src/features/realtime-meeting/model/meeting-room-section.ts

slug 표는 위 파일을 옮겨 적은 것이라 양쪽이 어긋날 수 있다. `packages/shared`에
방 이름 규칙이 없어 지금은 공유할 방법이 없다.
"""

from datetime import date

from .errors import TranslationPipelineError

# Client의 LAB_MEETING_TEAM_SLUG와 같아야 한다.
LAB_TEAM_SLUG = "likelion"

# Client의 MEETING_ROOM_SECTION_METADATA에서 roomSlug만 옮긴 것이다.
SECTION_SLUGS: dict[str, str] = {
    "meeting-room": "meeting-room",
    "shared-collaboration-zone": "shared-collab",
    "korea-team-zone": "korea-team",
    "vietnam-team-zone": "vietnam-team",
}

DEFAULT_SECTION = "meeting-room"


class UnknownMeetingSectionError(TranslationPipelineError):
    """Client에 없는 구역 이름을 받았을 때 발생한다."""


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
