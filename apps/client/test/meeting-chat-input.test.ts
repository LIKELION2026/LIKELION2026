import assert from "node:assert/strict";
import test from "node:test";

import { shouldSubmitMeetingChatDraftKey } from "../src/features/realtime-meeting/model/meeting-chat-input.ts";

test("submits meeting chat draft on plain Enter", () => {
  assert.equal(
    shouldSubmitMeetingChatDraftKey({
      key: "Enter",
      shiftKey: false
    }),
    true
  );
});

test("keeps newline behavior for Shift Enter", () => {
  assert.equal(
    shouldSubmitMeetingChatDraftKey({
      key: "Enter",
      shiftKey: true
    }),
    false
  );
});

test("does not submit while IME composition is active", () => {
  assert.equal(
    shouldSubmitMeetingChatDraftKey({
      isComposing: true,
      key: "Enter",
      shiftKey: false
    }),
    false
  );
});

test("does not submit legacy IME Enter key events", () => {
  assert.equal(
    shouldSubmitMeetingChatDraftKey({
      key: "Enter",
      keyCode: 229,
      shiftKey: false
    }),
    false
  );
});
