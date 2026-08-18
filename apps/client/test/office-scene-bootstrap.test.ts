import assert from "node:assert/strict";
import test from "node:test";
import type { OfficeMemberPresence } from "@likelion2026/shared";

import { getOfficeSceneBootstrap } from "../src/features/virtual-office/model/office-scene-bootstrap.ts";

const member: OfficeMemberPresence = {
  avatar: { animation: "idle", direction: "left", x: 624, y: 384 },
  avatarId: "red-panda",
  displayName: "민지",
  language: "ko",
  memberId: "member-minji",
  status: "available",
  updatedAt: "2026-08-18T00:00:00.000Z"
};

test("waits for the self snapshot before creating the office scene", () => {
  assert.equal(getOfficeSceneBootstrap(null), null);
});

test("uses the saved avatar position as the scene bootstrap position", () => {
  assert.deepEqual(getOfficeSceneBootstrap(member), {
    direction: "left",
    x: 624,
    y: 384
  });
});
