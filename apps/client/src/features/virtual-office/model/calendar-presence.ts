import {
  type CalendarMemberStatus,
  type MemberStatus,
  type OfficeMemberPresence
} from "@likelion2026/shared";

export type CalendarPresenceTranslationKey =
  | `calendarPresence.${CalendarMemberStatus["availabilityStatus"]}`
  | "calendarPresence.ghost"
  | "calendarPresence.sleeping"
  | `memberStatus.${MemberStatus}`;

const CALENDAR_STATUS_TRANSLATION_KEYS: Record<
  CalendarMemberStatus["availabilityStatus"],
  `calendarPresence.${CalendarMemberStatus["availabilityStatus"]}`
> = {
  absent: "calendarPresence.absent",
  available: "calendarPresence.available",
  focus: "calendarPresence.focus",
  meeting: "calendarPresence.meeting",
  remote_work: "calendarPresence.remote_work",
  vacation: "calendarPresence.vacation"
};

const MEMBER_STATUS_TRANSLATION_KEYS: Record<
  MemberStatus,
  `memberStatus.${MemberStatus}`
> = {
  available: "memberStatus.available",
  away: "memberStatus.away",
  focused: "memberStatus.focused",
  in_meeting: "memberStatus.in_meeting"
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

  const { statusMessage: _statusMessage, ...officePresence } = member.officePresence;

  return {
    ...member,
    officePresence: {
      ...officePresence,
      availabilityStatus: calendarStatus.availabilityStatus,
      displayMode: calendarStatus.displayMode
    },
    status: toMemberStatus(calendarStatus.availabilityStatus)
  };
}

export function getCalendarPresenceTranslationKey(
  member: OfficeMemberPresence
): CalendarPresenceTranslationKey {
  const presence = member.officePresence;
  if (!presence) {
    return MEMBER_STATUS_TRANSLATION_KEYS[member.status];
  }
  if (presence.displayMode === "sleeping") {
    return "calendarPresence.sleeping";
  }
  if (presence.connectionStatus === "disconnected" && presence.displayMode === "ghost") {
    return "calendarPresence.ghost";
  }
  return CALENDAR_STATUS_TRANSLATION_KEYS[presence.availabilityStatus] ?? MEMBER_STATUS_TRANSLATION_KEYS[member.status];
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
