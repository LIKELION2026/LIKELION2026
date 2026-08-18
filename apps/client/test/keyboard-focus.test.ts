import assert from "node:assert/strict";
import test from "node:test";

import { isTextEntryFocused } from "../src/features/virtual-office/model/keyboard-focus";

test("blocks office movement while a text entry control is focused", () => {
  assert.equal(isTextEntryFocused({ tagName: "INPUT" }), true);
  assert.equal(isTextEntryFocused({ tagName: "TEXTAREA" }), true);
  assert.equal(isTextEntryFocused({ isContentEditable: true, tagName: "DIV" }), true);
});

test("allows office movement when no text entry control is focused", () => {
  assert.equal(isTextEntryFocused(null), false);
  assert.equal(isTextEntryFocused({ tagName: "BUTTON" }), false);
});
