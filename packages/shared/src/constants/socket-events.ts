export const SOCKET_EVENT_NAMES = {
  BRIEFING_CONFIRMED: "briefing.confirmed",
  BRIEFING_DRAFTED: "briefing.drafted",
  MEMBER_STATUS_UPDATE: "member.status.update",
  MEETING_JOINED: "meeting.joined",
  MEETING_REQUESTED: "meeting.requested",
  MEMBER_STATUS_UPDATED: "member.status.updated",
  OFFICE_ATTENDANCE_UPDATE: "office.attendance.update",
  OFFICE_ATTENDANCE_UPDATED: "office.attendance.updated",
  OFFICE_HEARTBEAT: "office.heartbeat",
  OFFICE_JOIN: "office.join",
  OFFICE_LIFECYCLE_UPDATED: "office.lifecycle.updated",
  OFFICE_MEMBER_JOINED: "office.member.joined",
  OFFICE_MEMBER_LEFT: "office.member.left",
  OFFICE_SNAPSHOT: "office.snapshot",
  PRESENCE_MOVE: "presence.move",
  PRESENCE_MOVED: "presence.moved",
  PRESENCE_UPDATED: "presence.updated",
  SUBTITLE_CREATED: "subtitle.created"
} as const;

export type SocketEventName =
  (typeof SOCKET_EVENT_NAMES)[keyof typeof SOCKET_EVENT_NAMES];
