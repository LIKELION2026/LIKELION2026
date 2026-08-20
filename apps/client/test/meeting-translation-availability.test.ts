import assert from "node:assert/strict";
import test from "node:test";

import { createMeetingTranslationAvailability } from "../src/features/realtime-meeting/model/meeting-translation-availability.ts";

test("reports translation as off without implying chat is unavailable", () => {
  assert.deepEqual(
    createMeetingTranslationAvailability({
      isEnabled: false,
      subtitleStatus: "idle"
    }),
    {
      descriptionKey: "meetingTranslationAvailability.off.description",
      status: "off",
      titleKey: "meetingTranslationAvailability.off.title"
    }
  );
});

test("reports a ready waiting state when the subtitle socket is subscribed", () => {
  assert.deepEqual(
    createMeetingTranslationAvailability({
      isEnabled: true,
      subtitleStatus: "subscribed"
    }),
    {
      descriptionKey: "meetingTranslationAvailability.ready.description",
      status: "ready",
      titleKey: "meetingTranslationAvailability.ready.title"
    }
  );
});

test("reports connection failure when the subtitle channel fails", () => {
  assert.deepEqual(
    createMeetingTranslationAvailability({
      errorMessage: "websocket failed",
      isEnabled: true,
      subtitleStatus: "failed"
    }),
    {
      descriptionKey: "meetingTranslationAvailability.unavailable.description",
      errorMessage: "websocket failed",
      status: "unavailable",
      titleKey: "meetingTranslationAvailability.unavailable.title"
    }
  );
});
