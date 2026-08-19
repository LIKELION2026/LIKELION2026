import assert from "node:assert/strict";
import test from "node:test";
import { OFFICE_DEFAULT_DESKS, OFFICE_MEETING_ZONES } from "@likelion2026/shared";

import {
  getNearestWalkableOfficePosition,
  isOfficeCollisionDebugEnabled,
  isOfficeWalkablePosition,
  OFFICE_COLLISION_AREAS,
  OFFICE_WALKABLE_BOUNDS,
} from "../src/features/virtual-office/model/office-collision.ts";

test("keeps every assigned desk in a walkable position", () => {
  assert.equal(OFFICE_DEFAULT_DESKS.length, 12);

  for (const desk of OFFICE_DEFAULT_DESKS) {
    assert.equal(
      isOfficeWalkablePosition({ x: desk.positionX, y: desk.positionY }),
      true,
      desk.label,
    );
  }
});

test("keeps a walkable position inside every meeting room trigger zone", () => {
  for (const zone of OFFICE_MEETING_ZONES) {
    const hasWalkablePosition = Array.from(
      { length: Math.floor(zone.height / 32) + 1 },
      (_, row) => zone.y + row * 32,
    ).some((y) =>
      Array.from(
        { length: Math.floor(zone.width / 32) + 1 },
        (_, column) => zone.x + column * 32,
      ).some((x) => isOfficeWalkablePosition({ x, y })),
    );

    assert.equal(hasWalkablePosition, true, zone.id);
  }
});

test("moves a teleport target out of a blocked furniture area", () => {
  const deskArea = OFFICE_COLLISION_AREAS.find(
    (area) => area.id === "west-desk-bank",
  );
  assert.ok(deskArea);

  const safePosition = getNearestWalkableOfficePosition({
    x: deskArea.x + deskArea.width / 2,
    y: deskArea.y + deskArea.height / 2,
  });

  assert.equal(isOfficeWalkablePosition(safePosition), true);
});

test("rejects positions outside the furnished office bounds", () => {
  assert.equal(
    isOfficeWalkablePosition({
      x: OFFICE_WALKABLE_BOUNDS.x - 1,
      y: OFFICE_WALKABLE_BOUNDS.y,
    }),
    false,
  );
});

test("enables collision debugging only when the URL explicitly requests it", () => {
  assert.equal(isOfficeCollisionDebugEnabled("?debugCollisions=1"), true);
  assert.equal(isOfficeCollisionDebugEnabled("?debugCollisions=0"), false);
  assert.equal(isOfficeCollisionDebugEnabled(""), false);
});
