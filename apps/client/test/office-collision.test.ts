import assert from "node:assert/strict";
import test from "node:test";
import { OFFICE_DEFAULT_DESKS, OFFICE_MEETING_ZONE } from "@likelion2026/shared";

import {
  getNearestWalkableOfficePosition,
  isOfficeWalkablePosition,
  OFFICE_COLLISION_AREAS,
  OFFICE_WALKABLE_BOUNDS,
} from "../src/features/virtual-office/model/office-collision.ts";

test("keeps every assigned desk in a walkable position", () => {
  for (const desk of OFFICE_DEFAULT_DESKS) {
    assert.equal(
      isOfficeWalkablePosition({ x: desk.positionX, y: desk.positionY }),
      true,
      desk.label,
    );
  }
});

test("keeps the meeting room entrance walkable", () => {
  assert.equal(
    isOfficeWalkablePosition({
      x: OFFICE_MEETING_ZONE.x + OFFICE_MEETING_ZONE.width / 2,
      y: OFFICE_MEETING_ZONE.y + 40,
    }),
    true,
  );
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
