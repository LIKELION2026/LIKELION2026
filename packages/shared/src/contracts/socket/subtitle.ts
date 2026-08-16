import type { LanguageCode } from "../../domain/language";

export interface SubtitleSpeaker {
  participantIdentity: string;
  displayName: string;
}

export interface SubtitleCreatedPayload {
  subtitleId: string;
  roomName: string;
  speaker: SubtitleSpeaker;
  sourceLanguage: LanguageCode;
  sourceText: string;
  translatedLanguage: LanguageCode;
  translatedText: string;
  occurredAt: string;
  isFinal: boolean;
  confidence?: number;
}
