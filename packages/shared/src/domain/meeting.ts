import type { LanguageCode } from "./language";

export interface MeetingParticipant {
  participantIdentity: string;
  participantName: string;
  preferredLanguage: LanguageCode;
}

export interface MeetingRoom {
  roomName: string;
  title?: string;
  createdAt: string;
}
