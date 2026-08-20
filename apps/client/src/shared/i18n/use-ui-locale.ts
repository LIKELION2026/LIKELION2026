import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  DEFAULT_UI_LOCALE,
  normalizeUiLocale,
  UI_LOCALE_OPTIONS,
  type UiLocale
} from "./ui-locale";

export function useUiLocale(): {
  locale: UiLocale;
  options: typeof UI_LOCALE_OPTIONS;
  setLocale: (locale: UiLocale) => void;
} {
  const { i18n } = useTranslation();
  const locale =
    normalizeUiLocale(i18n.resolvedLanguage ?? i18n.language) ??
    DEFAULT_UI_LOCALE;
  const setLocale = useCallback(
    (nextLocale: UiLocale) => {
      if (nextLocale !== locale) {
        void i18n.changeLanguage(nextLocale);
      }
    },
    [i18n, locale]
  );

  return useMemo(
    () => ({
      locale,
      options: UI_LOCALE_OPTIONS,
      setLocale
    }),
    [locale, setLocale]
  );
}
