import { SOCKET_EVENT_NAMES } from "../../constants/socket-events";
import type { LanguageCode } from "../../domain/language";
import {
  SUBTITLE_UPDATE_STRATEGY,
  type SubtitleCreatedPayload,
  type SubtitleSpeaker
} from "../socket/subtitle";

export const MEETING_ROOM_NAME_PATTERN = "^[a-zA-Z0-9][a-zA-Z0-9_-]{2,63}$";
export const LAB_MEETING_ROOM_NAME_PATTERN =
  "^lab-[a-zA-Z0-9][a-zA-Z0-9_-]{1,23}-[0-9]{8}-[a-zA-Z0-9][a-zA-Z0-9_-]{1,23}$";
export const PARTICIPANT_IDENTITY_PATTERN =
  "^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$";
export const MEETING_PARTICIPANT_COUNTRIES = ["kr", "vn"] as const;

export type MeetingParticipantCountry =
  (typeof MEETING_PARTICIPANT_COUNTRIES)[number];

export const MEETING_PARTICIPANT_COUNTRY_LABELS: Record<
  MeetingParticipantCountry,
  string
> = {
  kr: "Korea",
  vn: "Vietnam"
};

export const MEETING_PARTICIPANT_LANGUAGE_BY_COUNTRY: Record<
  MeetingParticipantCountry,
  LanguageCode
> = {
  kr: "ko",
  vn: "vi"
};

export interface CreateMeetingTokenRequest {
  roomName: string;
  participantName: string;
  participantCountry: MeetingParticipantCountry;
  participantIdentity?: string;
}

export interface CreateMeetingTokenResponse {
  serverUrl: string;
  token: string;
  roomName: string;
  participantIdentity: string;
  participantName: string;
  participantCountry: MeetingParticipantCountry;
  preferredLanguage: LanguageCode;
  expiresAt: string;
}

export type MeetingRoomStatus = "active" | "finished";

export interface MeetingParticipantState {
  participantIdentity: string;
  participantName?: string;
  publishedTrackSids: string[];
}

export interface MeetingRoomStateResponse {
  lastEvent: string;
  lastEventId?: string;
  participantCount: number;
  participants: MeetingParticipantState[];
  roomName: string;
  roomSid?: string;
  status: MeetingRoomStatus;
  trackCount: number;
  updatedAt: string;
}

export interface CreateMockSubtitleRequest {
  roomName: string;
  speaker: SubtitleSpeaker;
  sourceLanguage: LanguageCode;
  sourceText: string;
  translatedLanguage: LanguageCode;
  translatedText: string;
  subtitleId?: string;
  occurredAt?: string;
  isFinal?: boolean;
  revision?: number;
  confidence?: number;
}

export interface CreateMockSubtitleResponse {
  eventName: typeof SOCKET_EVENT_NAMES.SUBTITLE_CREATED;
  payload: SubtitleCreatedPayload;
}

export interface ListMockSubtitlesResponse {
  eventName: typeof SOCKET_EVENT_NAMES.SUBTITLE_CREATED;
  payloads: SubtitleCreatedPayload[];
  roomName: string;
  updateStrategy: typeof SUBTITLE_UPDATE_STRATEGY;
}
