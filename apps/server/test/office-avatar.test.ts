import assert from "node:assert/strict";
import test from "node:test";

import {
  GRAY_CAT_AVATAR_ID,
  selectNewGuestAvatarId
} from "../src/modules/office/office-avatar";

test("selectNewGuestAvatarId returns gray-cat for a new guest", () => {
  assert.equal(selectNewGuestAvatarId(), GRAY_CAT_AVATAR_ID);
});
