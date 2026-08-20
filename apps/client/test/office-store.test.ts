import assert from "node:assert/strict";
import test from "node:test";
import type { OfficeMemberPresence } from "@likelion2026/shared";

import { useOfficeStore } from "../src/features/virtual-office/model/office-store.ts";

const self: OfficeMemberPresence = {
  avatar: { animation: "idle", direction: "down", x: 192, y: 264 },
  avatarId: "office-avatar",
  displayName: "민지",
  language: "ko",
  memberId: "member-minji",
  status: "available",
  updatedAt: "2026-08-17T10:00:00.000Z"
};

test("updates the local avatar position before a heartbeat persists it", () => {
  useOfficeStore.getState().setSnapshot(self, [self]);

  useOfficeStore.getState().updateSelfPosition({
    animation: "idle",
    direction: "right",
    x: 432,
    y: 264
  });

  assert.deepEqual(useOfficeStore.getState().self?.avatar, {
    animation: "idle",
    direction: "right",
    x: 432,
    y: 264
  });
});
