import {
  isMeetingTranslationLanguageCode,
  type LanguageCode,
  type OfficeChatMessagePayload
} from "@likelion2026/shared";

export interface OfficeChatDisplayMessage {
  isTranslated: boolean;
  originalText?: string;
  text: string;
}

export function createOfficeChatDisplayMessage(
  message: OfficeChatMessagePayload,
  viewerLanguage: LanguageCode | undefined
): OfficeChatDisplayMessage {
  const targetLanguage = viewerLanguage ?? message.sourceLanguage;
  const translatedText = isMeetingTranslationLanguageCode(targetLanguage)
    ? message.translations?.[targetLanguage]?.trim()
    : undefined;

  if (!translatedText || targetLanguage === message.sourceLanguage) {
    return {
      isTranslated: false,
      text: message.text
    };
  }

  return {
    isTranslated: true,
    originalText: message.text,
    text: translatedText
  };
}
