import {
  MEMBER_STATUS_LABELS,
  type CalendarMemberStatus,
  type MemberStatus,
  type OfficeMemberPresence
} from "@likelion2026/shared";

const CALENDAR_STATUS_LABELS: Record<CalendarMemberStatus["availabilityStatus"], string> = {
  absent: "부재",
  available: "협업 가능",
  focus: "집중 작업",
  meeting: "회의 중",
  remote_work: "재택",
  vacation: "휴가"
};

export function applyCalendarPresence(
  member: OfficeMemberPresence,
  calendarStatuses: CalendarMemberStatus[],
  now: Date = new Date()
): OfficeMemberPresence {
  const calendarStatus = calendarStatuses.find(
    (status) => status.memberId === member.memberId && new Date(status.endsAt) > now
  );
  if (!calendarStatus || !member.officePresence) {
    return member;
  }

  return {
    ...member,
    officePresence: {
      ...member.officePresence,
      availabilityStatus: calendarStatus.availabilityStatus,
      displayMode: calendarStatus.displayMode,
      statusMessage: CALENDAR_STATUS_LABELS[calendarStatus.availabilityStatus]
    },
    status: toMemberStatus(calendarStatus.availabilityStatus)
  };
}

export function getCalendarPresenceLabel(member: OfficeMemberPresence): string {
  const presence = member.officePresence;
  if (!presence) {
    return MEMBER_STATUS_LABELS[member.status];
  }
  if (presence.displayMode === "sleeping") {
    return "퇴근";
  }
  if (presence.connectionStatus === "disconnected" && presence.displayMode === "ghost") {
    return "연결 해제";
  }
  return CALENDAR_STATUS_LABELS[presence.availabilityStatus] ?? MEMBER_STATUS_LABELS[member.status];
}

export function getCalendarPresenceTone(member: OfficeMemberPresence): string {
  const presence = member.officePresence;
  if (!presence) {
    return member.status;
  }
  if (presence.displayMode === "sleeping") {
    return "sleeping";
  }
  if (presence.connectionStatus === "disconnected" && presence.displayMode === "ghost") {
    return "ghost";
  }
  return presence.availabilityStatus;
}

export function shouldDimCalendarPresence(member: OfficeMemberPresence): boolean {
  const presence = member.officePresence;
  return (
    presence?.displayMode === "sleeping" ||
    (presence?.connectionStatus === "disconnected" && presence.displayMode === "ghost") ||
    presence?.availabilityStatus === "vacation" ||
    presence?.availabilityStatus === "absent"
  );
}

function toMemberStatus(availabilityStatus: CalendarMemberStatus["availabilityStatus"]): MemberStatus {
  if (availabilityStatus === "focus") {
    return "focused";
  }
  if (availabilityStatus === "meeting") {
    return "in_meeting";
  }
  if (availabilityStatus === "vacation" || availabilityStatus === "absent") {
    return "away";
  }
  return "available";
}
