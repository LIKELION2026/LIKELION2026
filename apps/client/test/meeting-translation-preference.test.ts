import assert from "node:assert/strict";
import test from "node:test";

import {
  activateMeetingTranslationPreference,
  createDefaultMeetingTranslationPreference,
  createMeetingTranslationParticipantAttributes,
  deactivateMeetingTranslationPreference,
  validateMeetingTranslationPreferenceDraft
} from "../src/features/realtime-meeting/model/meeting-translation-preference.ts";

test("creates a default on preference from the guest language", () => {
  assert.deepEqual(
    createDefaultMeetingTranslationPreference(
      "vi",
      "2026-08-19T09:00:00.000Z"
    ),
    {
      activatedAt: "2026-08-19T09:00:00.000Z",
      enabled: true,
      sourceLanguage: "vi",
      targetLanguage: "ko"
    }
  );
});

test("falls back to Korean when the guest language is not supported for meeting translation", () => {
  assert.deepEqual(
    createDefaultMeetingTranslationPreference(
      "en",
      "2026-08-19T09:00:00.000Z"
    ),
    {
      activatedAt: "2026-08-19T09:00:00.000Z",
      enabled: true,
      sourceLanguage: "ko",
      targetLanguage: "vi"
    }
  );
});

test("validates source and target languages before enabling translation", () => {
  assert.deepEqual(
    validateMeetingTranslationPreferenceDraft({
      sourceLanguage: "ko",
      targetLanguage: "ko"
    }),
    {
      message: "나의 언어와 상대방에게 보여줄 언어는 서로 달라야 합니다.",
      ok: false,
      reason: "same-language"
    }
  );
});

test("activation records the exact point where translation starts", () => {
  assert.deepEqual(
    activateMeetingTranslationPreference(
      {
        sourceLanguage: "ko",
        targetLanguage: "vi"
      },
      "2026-08-19T09:00:00.000Z"
    ),
    {
      activatedAt: "2026-08-19T09:00:00.000Z",
      enabled: true,
      sourceLanguage: "ko",
      targetLanguage: "vi"
    }
  );
});

test("participant attributes match the LiveKit metadata contract", () => {
  assert.deepEqual(
    createMeetingTranslationParticipantAttributes({
      activatedAt: "2026-08-19T09:00:00.000Z",
      enabled: true,
      sourceLanguage: "vi",
      targetLanguage: "ko"
    }),
    {
      preferredLanguage: "vi",
      translationReceivingEnabled: "true",
      translationTargetLanguage: "ko"
    }
  );
});

test("turning translation off keeps the last language choice without an activation time", () => {
  assert.deepEqual(
    deactivateMeetingTranslationPreference({
      activatedAt: "2026-08-19T09:00:00.000Z",
      enabled: true,
      sourceLanguage: "vi",
      targetLanguage: "ko"
    }),
    {
      enabled: false,
      sourceLanguage: "vi",
      targetLanguage: "ko"
    }
  );
});
