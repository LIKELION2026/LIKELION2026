export const LANGUAGE_CODES = ["ko", "en"] as const;

export type LanguageCode = (typeof LANGUAGE_CODES)[number];

export const DEFAULT_LANGUAGE_CODE: LanguageCode = "ko";

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  en: "English",
  ko: "한국어"
};

export function isLanguageCode(value: string): value is LanguageCode {
  return (LANGUAGE_CODES as readonly string[]).includes(value);
}
