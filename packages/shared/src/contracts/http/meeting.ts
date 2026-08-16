import type { LanguageCode } from "../../domain/language";

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
