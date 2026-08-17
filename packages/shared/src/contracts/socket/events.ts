import { SOCKET_EVENT_NAMES } from "../../constants/socket-events";

import type {
  BriefingConfirmedPayload,
  BriefingDraftedPayload
} from "./briefing";
import type {
  MeetingJoinedPayload,
  MeetingRequestedPayload,
  MeetingRoomSubscriptionPayload,
  MeetingRoomSubscriptionRequest
} from "./meeting";
import type {
  MemberStatusUpdatedPayload,
  PresenceUpdatedPayload
} from "./presence";
import type { OfficeTodosUpdatedPayload } from "./office-lifecycle";
import type {
  OfficeSummonRequestPayload,
  OfficeSummonRequestedPayload,
  OfficeSummonRespondPayload,
  OfficeSummonResolvedPayload
} from "./office-summon";
import type { SubtitleCreatedPayload } from "./subtitle";

export type SocketEventPayloadMap = {
  [SOCKET_EVENT_NAMES.BRIEFING_CONFIRMED]: BriefingConfirmedPayload;
  [SOCKET_EVENT_NAMES.BRIEFING_DRAFTED]: BriefingDraftedPayload;
  [SOCKET_EVENT_NAMES.MEETING_JOINED]: MeetingJoinedPayload;
  [SOCKET_EVENT_NAMES.MEETING_ROOM_SUBSCRIBE]: MeetingRoomSubscriptionRequest;
  [SOCKET_EVENT_NAMES.MEETING_ROOM_SUBSCRIBED]: MeetingRoomSubscriptionPayload;
  [SOCKET_EVENT_NAMES.MEETING_ROOM_UNSUBSCRIBE]: MeetingRoomSubscriptionRequest;
  [SOCKET_EVENT_NAMES.MEETING_ROOM_UNSUBSCRIBED]: MeetingRoomSubscriptionPayload;
  [SOCKET_EVENT_NAMES.MEETING_REQUESTED]: MeetingRequestedPayload;
  [SOCKET_EVENT_NAMES.MEMBER_STATUS_UPDATED]: MemberStatusUpdatedPayload;
  [SOCKET_EVENT_NAMES.OFFICE_SUMMON_REQUEST]: OfficeSummonRequestPayload;
  [SOCKET_EVENT_NAMES.OFFICE_SUMMON_REQUESTED]: OfficeSummonRequestedPayload;
  [SOCKET_EVENT_NAMES.OFFICE_SUMMON_RESPOND]: OfficeSummonRespondPayload;
  [SOCKET_EVENT_NAMES.OFFICE_SUMMON_RESOLVED]: OfficeSummonResolvedPayload;
  [SOCKET_EVENT_NAMES.OFFICE_TODOS_UPDATED]: OfficeTodosUpdatedPayload;
  [SOCKET_EVENT_NAMES.PRESENCE_UPDATED]: PresenceUpdatedPayload;
  [SOCKET_EVENT_NAMES.SUBTITLE_CREATED]: SubtitleCreatedPayload;
};

export type SocketEventPayload<
  TEventName extends keyof SocketEventPayloadMap
> = SocketEventPayloadMap[TEventName];
