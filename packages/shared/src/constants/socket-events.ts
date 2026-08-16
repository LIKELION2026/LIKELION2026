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
  OFFICE_JOIN: "office.join",
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
