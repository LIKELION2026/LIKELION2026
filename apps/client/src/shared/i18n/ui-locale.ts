export const UI_LOCALE_STORAGE_KEY = "virtual-office.ui-locale";

export const SUPPORTED_UI_LOCALES = ["ko", "vi"] as const;

export type UiLocale = (typeof SUPPORTED_UI_LOCALES)[number];

export const DEFAULT_UI_LOCALE: UiLocale = "ko";

export const UI_LOCALE_OPTIONS: Array<{ code: UiLocale; label: string }> = [
  { code: "ko", label: "한국어" },
  { code: "vi", label: "Tiếng Việt" }
];

export function normalizeUiLocale(value: unknown): UiLocale | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();
  const languageCode = normalizedValue.split("-")[0];

  return SUPPORTED_UI_LOCALES.includes(languageCode as UiLocale)
    ? (languageCode as UiLocale)
    : null;
}

export function resolveInitialUiLocale({
  browserLanguages = [],
  storedLocale
}: {
  browserLanguages?: readonly string[];
  storedLocale?: unknown;
} = {}): UiLocale {
  const normalizedStoredLocale = normalizeUiLocale(storedLocale);
  if (normalizedStoredLocale) {
    return normalizedStoredLocale;
  }

  for (const browserLanguage of browserLanguages) {
    const normalizedBrowserLocale = normalizeUiLocale(browserLanguage);
    if (normalizedBrowserLocale) {
      return normalizedBrowserLocale;
    }
  }

  return DEFAULT_UI_LOCALE;
}

export function getInitialUiLocale(): UiLocale {
  return resolveInitialUiLocale({
    browserLanguages: getBrowserLanguages(),
    storedLocale: readStoredUiLocale()
  });
}

export function readStoredUiLocale(): UiLocale | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    return normalizeUiLocale(window.localStorage.getItem(UI_LOCALE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveStoredUiLocale(locale: UiLocale): void {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(UI_LOCALE_STORAGE_KEY, locale);
  } catch {
    // localStorage can be unavailable in restricted browsing modes.
  }
}

export function applyDocumentUiLocale(locale: UiLocale): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.lang = locale;
}

function getBrowserLanguages(): readonly string[] {
  if (typeof navigator === "undefined") {
    return [];
  }

  return navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language];
}

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}
