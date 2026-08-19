import assert from "node:assert/strict";
import test from "node:test";

import {
  getRequiredAvatarFrameIndices,
  getAvatarSpriteDefinitions,
  getAvatarSpriteDefinition,
} from "../src/features/virtual-office/core/avatar-sprite-definition.ts";
import { removeNearTransparentPixels } from "../src/features/virtual-office/core/avatar-pixel-normalizer.ts";

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

test("keeps every avatar scale within a renderable range", () => {
  assert.equal(
    getAvatarSpriteDefinitions().every(
      (definition) => definition.scale > 0 && definition.scale <= 1,
    ),
    true,
  );
});

test("removes near-transparent frame guide pixels without losing opaque sprite parts", () => {
  const width = 4;
  const height = 4;
  const alpha = new Uint8ClampedArray(width * height * 4);
  const setOpaque = (x: number, y: number) => {
    alpha[(y * width + x) * 4 + 3] = 255;
  };

  alpha[(1 * width + 0) * 4 + 3] = 1;
  alpha[(0 * width + 3) * 4 + 3] = 8;
  setOpaque(1, 1);
  setOpaque(2, 1);
  setOpaque(1, 2);

  const normalized = removeNearTransparentPixels(alpha);

  assert.equal(normalized[(1 * width + 0) * 4 + 3], 0);
  assert.equal(normalized[(0 * width + 3) * 4 + 3], 0);
  assert.equal(normalized[(1 * width + 1) * 4 + 3], 255);
  assert.equal(normalized[(1 * width + 2) * 4 + 3], 255);
  assert.equal(normalized[(2 * width + 1) * 4 + 3], 255);
});
