import assert from "node:assert/strict";
import test from "node:test";

import {
  getRequiredAvatarFrameIndices,
  getAvatarSpriteDefinitions,
  getAvatarSpriteDefinition,
} from "../src/features/virtual-office/core/avatar-sprite-definition.ts";

test("creates only sprite frames referenced by idle and walking animations", () => {
  const frames = getRequiredAvatarFrameIndices(getAvatarSpriteDefinition("dog"));

  assert.deepEqual(frames, [
    0, 1, 2,
    6, 7, 8, 9, 10, 11,
    12, 13, 14, 15, 16, 17,
    18, 19, 20, 21, 22, 23,
  ]);
  assert.equal(frames.includes(3), false);
});

test("scales every avatar for the furnished office map", () => {
  assert.equal(
    getAvatarSpriteDefinitions().every((definition) => definition.scale === 0.24),
    true,
  );
});
