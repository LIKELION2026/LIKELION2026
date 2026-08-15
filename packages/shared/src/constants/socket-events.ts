export const SOCKET_EVENT_NAMES = {
  BRIEFING_CONFIRMED: "briefing.confirmed",
  BRIEFING_DRAFTED: "briefing.drafted",
  MEETING_JOINED: "meeting.joined",
  MEETING_REQUESTED: "meeting.requested",
  MEMBER_STATUS_UPDATED: "member.status.updated",
  PRESENCE_UPDATED: "presence.updated",
  SUBTITLE_CREATED: "subtitle.created"
} as const;

export type SocketEventName =
  (typeof SOCKET_EVENT_NAMES)[keyof typeof SOCKET_EVENT_NAMES];
