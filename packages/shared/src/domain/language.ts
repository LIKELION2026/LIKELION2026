export const LANGUAGE_CODES = ["ko", "en", "vi"] as const;

export type LanguageCode = (typeof LANGUAGE_CODES)[number];

export const DEFAULT_LANGUAGE_CODE: LanguageCode = "ko";

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  en: "English",
  ko: "Korean",
  vi: "Vietnamese"
};

export function isLanguageCode(value: string): value is LanguageCode {
  return (LANGUAGE_CODES as readonly string[]).includes(value);
}
