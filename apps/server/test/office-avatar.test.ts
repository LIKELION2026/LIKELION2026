import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_OFFICE_AVATAR_ID,
  selectNewGuestAvatarId
} from "../src/modules/office/office-avatar";

test("selectNewGuestAvatarId returns the red-panda office avatar for a new guest", () => {
  assert.equal(selectNewGuestAvatarId(), DEFAULT_OFFICE_AVATAR_ID);
});
