import assert from "node:assert/strict";
import test from "node:test";

import {
  OFFICE_MAP,
  OFFICE_MAP_DEFAULT_DESKS,
  OFFICE_MAP_MEETING_ZONE,
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
  assert.equal(OFFICE_MAP_DEFAULT_DESKS.length, 6);

  for (const desk of OFFICE_MAP_DEFAULT_DESKS) {
    assert.ok(desk.positionX > 200 && desk.positionX < 1500);
    assert.ok(desk.positionY > 1000 && desk.positionY < 1900);
  }
});

test("places the meeting interaction zone over the large lower meeting room", () => {
  assert.deepEqual(OFFICE_MAP_MEETING_ZONE, {
    height: 580,
    width: 1320,
    x: 1380,
    y: 2110,
  });
});
