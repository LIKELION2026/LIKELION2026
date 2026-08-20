import type {
  LanguageCode,
  MeetingTranslationLanguageCode
} from "../../domain/language";

export interface OfficeChatSendPayload {
  text: string;
}

export type OfficeChatTranslations = Partial<
  Record<MeetingTranslationLanguageCode, string>
>;

export interface OfficeChatMessagePayload {
  displayName: string;
  memberId: string;
  occurredAt: string;
  sourceLanguage: LanguageCode;
  teamId: string;
  text: string;
  translations?: OfficeChatTranslations;
}
