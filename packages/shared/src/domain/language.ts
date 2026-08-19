export const LANGUAGE_CODES = ["ko", "vi", "en"] as const;

export type LanguageCode = (typeof LANGUAGE_CODES)[number];

export const DEFAULT_LANGUAGE_CODE: LanguageCode = "ko";

export const MEETING_TRANSLATION_LANGUAGE_CODES = ["ko", "vi"] as const;

export type MeetingTranslationLanguageCode =
  (typeof MEETING_TRANSLATION_LANGUAGE_CODES)[number];

export const DEFAULT_MEETING_TRANSLATION_LANGUAGE: MeetingTranslationLanguageCode =
  "ko";

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  en: "English",
  ko: "한국어",
  vi: "Tiếng Việt"
};

export function isLanguageCode(value: string): value is LanguageCode {
  return (LANGUAGE_CODES as readonly string[]).includes(value);
}

export function isMeetingTranslationLanguageCode(
  value: string
): value is MeetingTranslationLanguageCode {
  return (MEETING_TRANSLATION_LANGUAGE_CODES as readonly string[]).includes(
    value
  );
}

export function toMeetingTranslationLanguageCode(
  value: string | undefined | null,
  fallback: MeetingTranslationLanguageCode = DEFAULT_MEETING_TRANSLATION_LANGUAGE
): MeetingTranslationLanguageCode {
  const normalizedValue = typeof value === "string" ? value.trim() : "";

  return isMeetingTranslationLanguageCode(normalizedValue)
    ? normalizedValue
    : fallback;
}

export function getOppositeMeetingTranslationLanguage(
  language: MeetingTranslationLanguageCode
): MeetingTranslationLanguageCode {
  return language === "ko" ? "vi" : "ko";
}
