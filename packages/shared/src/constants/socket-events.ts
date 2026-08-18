export const SOCKET_EVENT_NAMES = {
  BRIEFING_CONFIRMED: "briefing.confirmed",
  BRIEFING_DRAFTED: "briefing.drafted",
  MEMBER_STATUS_UPDATE: "member.status.update",
  MEETING_JOINED: "meeting.joined",
  MEETING_ROOM_SUBSCRIBE: "meeting.room.subscribe",
  MEETING_ROOM_SUBSCRIBED: "meeting.room.subscribed",
  MEETING_ROOM_UNSUBSCRIBE: "meeting.room.unsubscribe",
  MEETING_ROOM_UNSUBSCRIBED: "meeting.room.unsubscribed",
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
  OFFICE_SUMMON_REQUEST: "office.summon.request",
  OFFICE_SUMMON_REQUESTED: "office.summon.requested",
  OFFICE_SUMMON_RESPOND: "office.summon.respond",
  OFFICE_SUMMON_RESOLVED: "office.summon.resolved",
  OFFICE_TODOS_UPDATED: "office.todos.updated",
  PRESENCE_MOVE: "presence.move",
  PRESENCE_MOVED: "presence.moved",
  PRESENCE_UPDATED: "presence.updated",
  SUBTITLE_CREATED: "subtitle.created"
} as const;

export type SocketEventName =
  (typeof SOCKET_EVENT_NAMES)[keyof typeof SOCKET_EVENT_NAMES];
