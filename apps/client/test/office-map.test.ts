import assert from "node:assert/strict";
import test from "node:test";

import {
  OFFICE_MAP,
  OFFICE_MAP_DEFAULT_DESKS,
  OFFICE_MAP_MEETING_ZONES,
} from "../src/features/virtual-office/model/office-map.ts";

test("uses the Figma furniture map at its exported game resolution", () => {
  assert.deepEqual(OFFICE_MAP, {
    assetPath: "/assets/maps/office-map.png",
    height: 2804,
    textureKey: "office-map",
    width: 4096,
  });
});

test("keeps every default desk inside the furnished open-office area", () => {
  assert.equal(OFFICE_MAP_DEFAULT_DESKS.length, 12);

  for (const desk of OFFICE_MAP_DEFAULT_DESKS) {
    assert.ok(desk.positionX > 200 && desk.positionX < 1500);
    assert.ok(desk.positionY > 1000 && desk.positionY < 1900);
  }
});

test("places the meeting interaction zones over configured meeting rooms", () => {
  assert.deepEqual(OFFICE_MAP_MEETING_ZONES, [
    {
      height: 594,
      id: "main-meeting-room",
      label: "회의실 1",
      width: 1346,
      x: 1383,
      y: 1838,
    },
    {
      height: 373,
      id: "meeting-zone-1",
      label: "회의실 1",
      width: 806,
      x: 1064,
      y: 334,
    },
    {
      height: 357,
      id: "meeting-zone-2",
      label: "회의실 2",
      width: 448,
      x: 1964,
      y: 325,
    },
    {
      height: 349,
      id: "meeting-zone-3",
      label: "회의실 3",
      width: 541,
      x: 2483,
      y: 337,
    },
  ]);
});
