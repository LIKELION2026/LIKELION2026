import assert from "node:assert/strict";
import test from "node:test";

import {
  applyDocumentUiLocale,
  DEFAULT_UI_LOCALE,
  normalizeUiLocale,
  resolveInitialUiLocale,
  saveStoredUiLocale,
  UI_LOCALE_STORAGE_KEY
} from "../src/shared/i18n/ui-locale.ts";
import { MEETING_TRANSLATION_PREFERENCE_STORAGE_KEY } from "../src/features/realtime-meeting/model/meeting-translation-preference.ts";
import { resources } from "../src/shared/i18n/resources.ts";

test("normalizes supported UI locale values", () => {
  assert.equal(normalizeUiLocale("ko"), "ko");
  assert.equal(normalizeUiLocale("vi-VN"), "vi");
  assert.equal(normalizeUiLocale(" KO-kr "), "ko");
});

test("rejects unsupported UI locale values", () => {
  assert.equal(normalizeUiLocale("en"), null);
  assert.equal(normalizeUiLocale(""), null);
  assert.equal(normalizeUiLocale(null), null);
});

test("restores stored UI locale before applying the Korean default", () => {
  assert.equal(
    resolveInitialUiLocale({
      browserLanguages: ["ko-KR"],
      storedLocale: "vi"
    }),
    "vi"
  );
});

test("uses Korean as the first-visit default regardless of browser language", () => {
  assert.equal(
    resolveInitialUiLocale({
      browserLanguages: ["vi-VN", "en-US"]
    }),
    DEFAULT_UI_LOCALE
  );
});

test("falls back to Korean when the stored locale is unsupported", () => {
  assert.equal(
    resolveInitialUiLocale({
      browserLanguages: ["en-US"],
      storedLocale: "fr"
    }),
    DEFAULT_UI_LOCALE
  );
});

test("keeps the UI locale storage key separate from meeting translation storage", () => {
  assert.equal(UI_LOCALE_STORAGE_KEY, "virtual-office.ui-locale");
  assert.notEqual(UI_LOCALE_STORAGE_KEY, MEETING_TRANSLATION_PREFERENCE_STORAGE_KEY);
});

test("persists changed UI locale without touching meeting translation storage", () => {
  const storage = new Map<string, string>();
  const previousWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value)
      }
    }
  });

  try {
    storage.set(MEETING_TRANSLATION_PREFERENCE_STORAGE_KEY, "meeting-value");
    saveStoredUiLocale("vi");

    assert.equal(storage.get(UI_LOCALE_STORAGE_KEY), "vi");
    assert.equal(
      storage.get(MEETING_TRANSLATION_PREFERENCE_STORAGE_KEY),
      "meeting-value"
    );
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: previousWindow
    });
  }
});

test("applies UI locale to the document language immediately", () => {
  const previousDocument = globalThis.document;
  const documentStub = { documentElement: { lang: "" } };
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: documentStub
  });

  try {
    applyDocumentUiLocale("vi");
    assert.equal(documentStub.documentElement.lang, "vi");
    applyDocumentUiLocale("ko");
    assert.equal(documentStub.documentElement.lang, "ko");
  } finally {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: previousDocument
    });
  }
});

test("keeps Korean and Vietnamese resource trees aligned", () => {
  assert.deepEqual(
    flattenResourceKeys(resources.ko.translation),
    flattenResourceKeys(resources.vi.translation)
  );
});

test("provides onboarding copy in Korean and Vietnamese", () => {
  assert.equal(
    resources.ko.translation.guestOnboarding.submit.ready,
    "오피스 입장"
  );
  assert.equal(
    resources.vi.translation.guestOnboarding.submit.ready,
    "Vào văn phòng"
  );
});

function flattenResourceKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") {
    return [prefix];
  }

  return Object.entries(value)
    .flatMap(([key, child]) =>
      flattenResourceKeys(child, prefix ? `${prefix}.${key}` : key)
    )
    .sort();
}
