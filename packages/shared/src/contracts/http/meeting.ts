import type { LanguageCode } from "../../domain/language";

export const MEETING_ROOM_NAME_PATTERN = "^[a-zA-Z0-9][a-zA-Z0-9_-]{2,63}$";
export const LAB_MEETING_ROOM_NAME_PATTERN =
  "^lab-[a-zA-Z0-9][a-zA-Z0-9_-]{1,23}-[0-9]{8}-[a-zA-Z0-9][a-zA-Z0-9_-]{1,23}$";
export const PARTICIPANT_IDENTITY_PATTERN =
  "^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$";

export interface CreateMeetingTokenRequest {
  roomName: string;
  participantName: string;
  participantIdentity?: string;
  preferredLanguage?: LanguageCode;
}

export interface CreateMeetingTokenResponse {
  serverUrl: string;
  token: string;
  roomName: string;
  participantIdentity: string;
  participantName: string;
  expiresAt: string;
}
