import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_OFFICE_AVATAR_ID,
  getAvailableGuestAvatarIds,
  selectNewGuestAvatarId
} from "../src/modules/office/office-avatar";

test("getAvailableGuestAvatarIds excludes avatar ids already assigned in the workspace", () => {
  assert.deepEqual(getAvailableGuestAvatarIds(["cat", "red_panda"]), [
    "dog",
    "sheep",
    "monkey",
    "capybara",
    "hippo",
    "parrot",
    "zebra",
    "wolf",
    "cow",
    "eagle"
  ]);
});

test("includes every twelve selectable office avatars", () => {
  assert.deepEqual(getAvailableGuestAvatarIds([]), [
    "red_panda",
    "cat",
    "dog",
    "sheep",
    "monkey",
    "capybara",
    "hippo",
    "parrot",
    "zebra",
    "wolf",
    "cow",
    "eagle"
  ]);
});

test("selectNewGuestAvatarId selects from only the remaining avatar ids", () => {
  assert.equal(
    selectNewGuestAvatarId(["cat", "dog", "sheep", "monkey", "capybara", "hippo", "parrot", "zebra", "wolf"], () => 0),
    DEFAULT_OFFICE_AVATAR_ID
  );
});

test("selectNewGuestAvatarId returns null when every avatar is assigned", () => {
  assert.equal(
    selectNewGuestAvatarId(
      ["red_panda", "cat", "dog", "sheep", "monkey", "capybara", "hippo", "parrot", "zebra", "wolf", "cow", "eagle"],
      () => 0
    ),
    null
  );
});
