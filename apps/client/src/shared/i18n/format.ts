import type { UiLocale } from "./ui-locale";

export function toIntlLocale(locale: UiLocale): string {
  return locale === "vi" ? "vi-VN" : "ko-KR";
}

export function formatDateTime(
  value: Date | number | string,
  locale: UiLocale,
  options: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), options).format(
    new Date(value)
  );
}

export function formatNumber(
  value: number,
  locale: UiLocale,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(toIntlLocale(locale), options).format(value);
}
