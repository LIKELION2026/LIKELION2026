import { SOCKET_EVENT_NAMES } from "../../constants/socket-events";

import type {
  BriefingConfirmedPayload,
  BriefingDraftedPayload
} from "./briefing";
import type { MeetingJoinedPayload, MeetingRequestedPayload } from "./meeting";
import type {
  MemberStatusUpdatedPayload,
  PresenceUpdatedPayload
} from "./presence";
import type { SubtitleCreatedPayload } from "./subtitle";

export type SocketEventPayloadMap = {
  [SOCKET_EVENT_NAMES.BRIEFING_CONFIRMED]: BriefingConfirmedPayload;
  [SOCKET_EVENT_NAMES.BRIEFING_DRAFTED]: BriefingDraftedPayload;
  [SOCKET_EVENT_NAMES.MEETING_JOINED]: MeetingJoinedPayload;
  [SOCKET_EVENT_NAMES.MEETING_REQUESTED]: MeetingRequestedPayload;
  [SOCKET_EVENT_NAMES.MEMBER_STATUS_UPDATED]: MemberStatusUpdatedPayload;
  [SOCKET_EVENT_NAMES.PRESENCE_UPDATED]: PresenceUpdatedPayload;
  [SOCKET_EVENT_NAMES.SUBTITLE_CREATED]: SubtitleCreatedPayload;
};

export type SocketEventPayload<
  TEventName extends keyof SocketEventPayloadMap
> = SocketEventPayloadMap[TEventName];
