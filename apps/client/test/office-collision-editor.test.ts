import assert from "node:assert/strict";
import test from "node:test";

import {
  constrainDeskPosition,
  constrainMeetingZone,
  constrainCollisionArea,
  createCollisionArea,
  createMeetingZone,
  moveCollisionArea,
  moveMeetingZone,
  resizeCollisionArea,
  resizeMeetingZone,
  serializeOfficeConfiguration,
} from "../src/features/virtual-office/model/office-collision-editor.ts";

test("keeps a moved collision area inside the office world", () => {
  const moved = moveCollisionArea(
    { height: 100, id: "sample", width: 200, x: 100, y: 100 },
    { x: -30, y: -20 },
    { x: 10, y: 10 },
  );

  assert.equal(moved.x, 0);
  assert.equal(moved.y, 0);
});

test("constrains direct numeric edits to the office world", () => {
  const constrained = constrainCollisionArea({
    height: 40,
    id: "sample",
    width: 200,
    x: 4000,
    y: -20,
  });

  assert.equal(constrained.x, 3896);
  assert.equal(constrained.y, 0);
});

test("keeps a resized collision area above the minimum dimensions", () => {
  const resized = resizeCollisionArea(
    { height: 160, id: "sample", width: 200, x: 100, y: 100 },
    "north-west",
    { x: 500, y: 500 },
  );

  assert.equal(resized.width, 40);
  assert.equal(resized.height, 40);
  assert.equal(resized.x, 260);
  assert.equal(resized.y, 220);
});

test("serializes collision, meeting, and desk settings into their source constants", () => {
  const result = serializeOfficeConfiguration({
    areas: [{ height: 80, id: "sample", width: 120, x: 40, y: 60 }],
    desks: [{ label: "Korea desk 1", positionX: 80, positionY: 100, zone: "korea-zone" }],
    meetingZones: [
      { height: 240, id: "meeting-zone-1", labelKey: "officeMap.meetingZones.meetingRoom1", width: 360, x: 1000, y: 1600 },
      { height: 220, id: "meeting-zone-2", labelKey: "officeMap.meetingZones.meetingRoom2", width: 320, x: 1800, y: 1800 },
    ],
  });

  assert.match(result, /OFFICE_COLLISION_AREAS/);
  assert.match(result, /OFFICE_DEFAULT_DESKS/);
  assert.match(result, /OFFICE_MEETING_ZONES/);
  assert.match(result, /officeMap\.meetingZones\.meetingRoom2/);
  assert.match(result, /id: "sample"/);
  assert.match(result, /width: 120/);
});

test("constrains meeting zones and initial desks to the office world", () => {
  const meetingZone = constrainMeetingZone({
    height: 400,
    id: "meeting-zone-1",
    labelKey: "officeMap.meetingZones.meetingRoom1",
    width: 600,
    x: 3800,
    y: 2700,
  });
  const desk = constrainDeskPosition({
    label: "Korea desk 1",
    positionX: 5000,
    positionY: -20,
    zone: "korea-zone",
  });

  assert.equal(meetingZone.x, 3496);
  assert.equal(meetingZone.y, 2404);
  assert.equal(desk.positionX, 4096);
  assert.equal(desk.positionY, 0);
});

test("creates custom areas with stable and distinct identifiers", () => {
  assert.equal(createCollisionArea(0).id, "custom-collision-1");
  assert.equal(createCollisionArea(1).id, "custom-collision-2");
});

test("creates, moves, and resizes independently configurable meeting zones", () => {
  const firstZone = createMeetingZone(0);
  const secondZone = createMeetingZone(1);
  const moved = moveMeetingZone(firstZone, { x: -20, y: -20 }, { x: 20, y: 20 });
  const resized = resizeMeetingZone(secondZone, "south-east", { x: 10_000, y: 10_000 });

  assert.equal(firstZone.id, "meeting-zone-1");
  assert.equal(secondZone.id, "meeting-zone-2");
  assert.equal(moved.x, 0);
  assert.equal(moved.y, 0);
  assert.equal(resized.x + resized.width, 4096);
  assert.equal(resized.y + resized.height, 2804);
});
