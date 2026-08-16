import type { LanguageCode } from "../../domain/language";

export const SUBTITLE_UPDATE_STRATEGY = "replace-by-subtitle-id" as const;

export interface SubtitleSpeaker {
  participantIdentity: string;
  displayName: string;
}

export interface SubtitleCreatedPayload {
  /**
   * Stable id for one spoken subtitle segment. Partial updates and final text
   * for the same utterance reuse this value.
   */
  subtitleId: string;
  roomName: string;
  speaker: SubtitleSpeaker;
  sourceLanguage: LanguageCode;
  sourceText: string;
  translatedLanguage: LanguageCode;
  translatedText: string;
  occurredAt: string;
  isFinal: boolean;
  /**
   * 1-based monotonic revision for the same subtitleId. Clients ignore older
   * revisions when partial updates arrive out of order.
   */
  revision: number;
  confidence?: number;
}
