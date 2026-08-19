import assert from "node:assert/strict";
import test from "node:test";

import {
  getRequiredAvatarFrameIndices,
  getAvatarSpriteDefinitions,
  getAvatarSpriteDefinition,
  shouldFlipAvatarSprite,
} from "../src/features/virtual-office/core/avatar-sprite-definition.ts";
import {
  constrainOpaqueFrameOffset,
  removeDetachedPixelArtifacts,
  removeNearTransparentPixels,
} from "../src/features/virtual-office/core/avatar-pixel-normalizer.ts";

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

test("defines an icon centering offset for every avatar", () => {
  assert.equal(
    getAvatarSpriteDefinitions().every(
      (definition) =>
        Number.isFinite(definition.faceCenterOffset.x) &&
        Number.isFinite(definition.faceCenterOffset.y),
    ),
    true,
  );
});

test("uses a dedicated capybara baseline without changing the common baseline", () => {
  assert.notEqual(
    getAvatarSpriteDefinition("capybara").footBaseline,
    getAvatarSpriteDefinition("red_panda").footBaseline,
  );
  assert.ok(getAvatarSpriteDefinition("capybara").footBaseline < 236);
  assert.equal(getAvatarSpriteDefinition("red_panda").footBaseline, 236);
});

test("keeps side-facing direction stable across walking, idle, and sitting", () => {
  for (const animation of ["walk", "idle", "sit"] as const) {
    assert.equal(shouldFlipAvatarSprite("wolf", "left", animation), true);
    assert.equal(shouldFlipAvatarSprite("wolf", "right", animation), false);
  }
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

test("removes detached sprite artifacts while keeping the main sprite component", () => {
  const width = 8;
  const height = 8;
  const pixels = new Uint8ClampedArray(width * height * 4);
  const setOpaque = (x: number, y: number) => {
    pixels[(y * width + x) * 4 + 3] = 255;
  };

  for (let y = 1; y <= 5; y += 1) {
    for (let x = 1; x <= 5; x += 1) {
      setOpaque(x, y);
    }
  }
  setOpaque(6, 6);
  setOpaque(7, 6);

  const normalized = removeDetachedPixelArtifacts(pixels, width, height);

  assert.equal(normalized[(1 * width + 1) * 4 + 3], 255);
  assert.equal(normalized[(6 * width + 6) * 4 + 3], 0);
  assert.equal(normalized[(6 * width + 7) * 4 + 3], 0);
});

test("keeps shifted sprite pixels inside the destination frame", () => {
  assert.equal(constrainOpaqueFrameOffset(-30, 8, 235, 252), -8);
  assert.equal(constrainOpaqueFrameOffset(24, 55, 251, 252), 0);
  assert.equal(constrainOpaqueFrameOffset(12, 48, 204, 252), 12);
});
