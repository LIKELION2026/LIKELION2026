import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import { resources } from "./resources";
import {
  applyDocumentUiLocale,
  DEFAULT_UI_LOCALE,
  getInitialUiLocale,
  normalizeUiLocale,
  saveStoredUiLocale,
  SUPPORTED_UI_LOCALES
} from "./ui-locale";
import type { UiLocale } from "./ui-locale";

const initialUiLocale = getInitialUiLocale();

void i18next.use(initReactI18next).init({
  defaultNS: "translation",
  fallbackLng: DEFAULT_UI_LOCALE,
  interpolation: {
    escapeValue: false
  },
  lng: initialUiLocale,
  resources,
  returnNull: false,
  supportedLngs: [...SUPPORTED_UI_LOCALES]
});

syncUiLocaleSideEffects(initialUiLocale);

i18next.on("languageChanged", (language) => {
  syncUiLocaleSideEffects(normalizeUiLocale(language) ?? DEFAULT_UI_LOCALE);
});

function syncUiLocaleSideEffects(locale: UiLocale): void {
  saveStoredUiLocale(locale);
  applyDocumentUiLocale(locale);
}

export { i18next as i18n };
export * from "./format";
export * from "./ui-locale";
export * from "./use-ui-locale";
