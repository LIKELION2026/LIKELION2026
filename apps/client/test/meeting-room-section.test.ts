import assert from "node:assert/strict";
import test from "node:test";

import {
  createMeetingRoomSection,
  createMeetingRoomSectionByOfficeZoneId,
  resolveMeetingRoomSection,
} from "../src/features/realtime-meeting/model/meeting-room-section.ts";

const TEST_DATE = new Date(2026, 7, 17);

test("creates distinct daily LiveKit rooms for every physical meeting section", () => {
  assert.deepEqual(
    [
      createMeetingRoomSection("meeting-room", TEST_DATE),
      createMeetingRoomSection("meeting-room-1", TEST_DATE),
      createMeetingRoomSection("meeting-room-2", TEST_DATE),
      createMeetingRoomSection("meeting-room-3", TEST_DATE),
    ].map((section) => section.roomName),
    [
      "lab-likelion-20260817-meeting-room",
      "lab-likelion-20260817-meeting-room-1",
      "lab-likelion-20260817-meeting-room-2",
      "lab-likelion-20260817-meeting-room-3",
    ],
  );
});

test("resolves LiveKit rooms from office meeting zone ids", () => {
  assert.equal(
    createMeetingRoomSectionByOfficeZoneId("main-meeting-room", TEST_DATE)
      .roomName,
    "lab-likelion-20260817-meeting-room",
  );
  assert.equal(
    createMeetingRoomSectionByOfficeZoneId("meeting-zone-1", TEST_DATE)
      .roomName,
    "lab-likelion-20260817-meeting-room-1",
  );
  assert.equal(
    createMeetingRoomSectionByOfficeZoneId("meeting-zone-2", TEST_DATE)
      .roomName,
    "lab-likelion-20260817-meeting-room-2",
  );
  assert.equal(
    createMeetingRoomSectionByOfficeZoneId("meeting-zone-3", TEST_DATE)
      .roomName,
    "lab-likelion-20260817-meeting-room-3",
  );
});

test("resolves meeting lab query sections and falls back to the default room", () => {
  assert.equal(
    resolveMeetingRoomSection("?section=meeting-room-2", TEST_DATE).roomName,
    "lab-likelion-20260817-meeting-room-2",
  );
  assert.equal(
    resolveMeetingRoomSection("?section=korea-team-zone", TEST_DATE).roomName,
    "lab-likelion-20260817-meeting-room",
  );
});
