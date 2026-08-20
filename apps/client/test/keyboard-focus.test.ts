import assert from "node:assert/strict";
import test from "node:test";

import { isTextEntryFocused } from "../src/features/virtual-office/model/keyboard-focus.ts";

test("blocks office movement while a text entry control is focused", () => {
  assert.equal(isTextEntryFocused({ tagName: "INPUT" }), true);
  assert.equal(isTextEntryFocused({ tagName: "TEXTAREA" }), true);
  assert.equal(isTextEntryFocused({ isContentEditable: true, tagName: "DIV" }), true);
});

test("allows office movement when no text entry control is focused", () => {
  assert.equal(isTextEntryFocused(null), false);
  assert.equal(isTextEntryFocused({ tagName: "BUTTON" }), false);
  assert.equal(isTextEntryFocused({ tagName: "SELECT" }), false);
});

test("allows office movement while an overlay button is focused", () => {
  assert.equal(
    isTextEntryFocused({
      closest: (selector: string) =>
        selector === "[data-office-keyboard-scope]" ? ({} as Element) : null,
      tagName: "BUTTON"
    }),
    false
  );
});
