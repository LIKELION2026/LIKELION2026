import assert from "node:assert/strict";
import test from "node:test";
import type { CalendarMemberStatus, OfficeMemberPresence } from "@likelion2026/shared";

import {
  applyCalendarPresence,
  getCalendarPresenceTranslationKey
} from "../src/features/virtual-office/model/calendar-presence.ts";

const member: OfficeMemberPresence = {
  avatar: { animation: "idle", direction: "down", x: 192, y: 264 },
  avatarId: "red-panda",
  displayName: "민지",
  language: "ko",
  memberId: "member-minji",
  officePresence: {
    attendanceStatus: "working",
    availabilityStatus: "available",
    avatar: { animation: "idle", direction: "down", x: 192, y: 264 },
    connectionStatus: "connected",
    displayMode: "active",
    memberId: "member-minji",
    updatedAt: "2026-08-18T00:00:00.000Z"
  },
  status: "available",
  updatedAt: "2026-08-18T00:00:00.000Z"
};

test("applies a current vacation schedule over the stored presence", () => {
  const result = applyCalendarPresence(member, [createCalendarStatus("vacation", "vacation")], new Date("2026-08-18T12:00:00.000Z"));

  assert.equal(result.status, "away");
  assert.equal(result.officePresence?.displayMode, "vacation");
  assert.equal(result.officePresence?.statusMessage, undefined);
  assert.equal(getCalendarPresenceTranslationKey(result), "calendarPresence.vacation");
});

test("keeps the stored presence after a calendar schedule has ended", () => {
  const result = applyCalendarPresence(member, [
    { ...createCalendarStatus("vacation", "vacation"), endsAt: "2026-08-18T00:00:00.000Z" }
  ], new Date("2026-08-18T12:00:00.000Z"));

  assert.equal(result, member);
  assert.equal(getCalendarPresenceTranslationKey(result), "calendarPresence.available");
});

function createCalendarStatus(
  availabilityStatus: CalendarMemberStatus["availabilityStatus"],
  displayMode: CalendarMemberStatus["displayMode"]
): CalendarMemberStatus {
  return {
    availabilityStatus,
    displayMode,
    endsAt: "2026-08-19T00:00:00.000Z",
    eventId: "event-1",
    eventType: "vacation",
    memberId: "member-minji"
  };
}
