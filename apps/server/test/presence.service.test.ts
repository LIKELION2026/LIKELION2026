import assert from "node:assert/strict";
import { test } from "node:test";

import type { OfficeMemberPresence } from "@likelion2026/shared";

import { PresenceService } from "../src/modules/presence/presence.service";

test("join restores the workspace snapshot and marks the member connected", async () => {
  const officeService = createOfficeService();
  const service = new PresenceService(officeService as never);

  const result = await service.join("socket-1", createJoinPayload());

  assert.equal(result.self.memberId, "member-1");
  assert.equal(result.members.length, 2);
  assert.deepEqual(officeService.connectCalls, [["member-1", "guest_1234567890abcdef"]]);
});

test("move broadcasts the local position without writing each event to storage", async () => {
  const officeService = createOfficeService();
  const service = new PresenceService(officeService as never);
  await service.join("socket-1", createJoinPayload());

  const member = await service.move("socket-1", {
    animation: "walk",
    direction: "right",
    sequence: 0,
    x: 320,
    y: 280
  });

  assert.equal(member?.avatar.x, 320);
  assert.equal(member?.avatar.y, 280);
  assert.equal(officeService.positionCalls.length, 0);
});

test("move returns immediately while a due position persistence is still pending", async () => {
  const officeService = createOfficeService();
  const service = new PresenceService(officeService as never);
  const originalDateNow = Date.now;
  let now = 1_000;

  Date.now = () => now;
  try {
    await service.join("socket-1", createJoinPayload());
    officeService.deferNextPositionUpdate();
    now += 1_000;

    const result = await Promise.race([
      service.move("socket-1", {
        animation: "walk",
        direction: "right",
        sequence: 0,
        x: 320,
        y: 280
      }),
      wait(10).then(() => "timed-out" as const)
    ]);

    if (result === "timed-out") {
      assert.fail("move must not wait for deferred position persistence");
    }
    assert.equal(result?.avatar.x, 320);
  } finally {
    Date.now = originalDateNow;
  }
});

test("leave persists the last position and switches the member to disconnected", async () => {
  const officeService = createOfficeService();
  const service = new PresenceService(officeService as never);
  await service.join("socket-1", createJoinPayload());
  await service.move("socket-1", {
    animation: "walk",
    direction: "down",
    sequence: 0,
    x: 250,
    y: 300
  });

  const member = await service.leave("socket-1");

  assert.equal(member?.officePresence?.connectionStatus, "disconnected");
  assert.deepEqual(officeService.disconnectCalls, [
    ["member-1", "guest_1234567890abcdef", 250, 300]
  ]);
});

test("leaving a stale socket keeps a member connected through the newer socket", async () => {
  const officeService = createOfficeService();
  const service = new PresenceService(officeService as never);
  await service.join("socket-previous", createJoinPayload());
  await service.join("socket-current", createJoinPayload());

  const member = await service.leave("socket-previous");

  assert.equal(member, null);
  assert.deepEqual(officeService.disconnectCalls, []);
});

function createJoinPayload() {
  return {
    displayName: "Korea PM",
    guestToken: "guest_1234567890abcdef",
    language: "ko" as const,
    memberId: "member-1",
    teamId: "workspace-1",
    workspaceId: "workspace-1"
  };
}

function createOfficeService() {
  const self = createMember("member-1", "Korea PM");
  const peer = createMember("member-2", "Vietnam Dev");
  let deferPositionUpdate = false;
  const officeService = {
    connectCalls: [] as string[][],
    disconnectCalls: [] as Array<[string, string, number, number]>,
    positionCalls: [] as Array<[string, string, number, number]>,
    deferNextPositionUpdate() {
      deferPositionUpdate = true;
    },
    async connectRealtimeMember(memberId: string, guestToken: string) {
      officeService.connectCalls.push([memberId, guestToken]);
      return self;
    },
    async disconnectRealtimeMember(
      memberId: string,
      guestToken: string,
      avatar: OfficeMemberPresence["avatar"]
    ) {
      officeService.disconnectCalls.push([memberId, guestToken, avatar.x, avatar.y]);
      return {
        ...self,
        avatar,
        officePresence: {
          ...self.officePresence,
          avatar,
          connectionStatus: "disconnected" as const
        }
      };
    },
    async getWorkspaceRealtimeMembers() {
      return [self, peer];
    },
    async heartbeatRealtimeMember() {
      return self;
    },
    async updateRealtimeMemberPosition(
      memberId: string,
      guestToken: string,
      avatar: OfficeMemberPresence["avatar"]
    ) {
      officeService.positionCalls.push([memberId, guestToken, avatar.x, avatar.y]);
      if (deferPositionUpdate) {
        deferPositionUpdate = false;
        await new Promise<void>(() => undefined);
      }
      return { ...self, avatar };
    },
    async updateRealtimeMemberStatus() {
      return self;
    }
  };

  return officeService;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function createMember(memberId: string, displayName: string): OfficeMemberPresence {
  return {
    avatarId: "office-avatar-01",
    avatar: { animation: "idle", direction: "down", x: 192, y: 264 },
    displayName,
    language: "ko",
    memberId,
    officePresence: {
      attendanceStatus: "working",
      availabilityStatus: "available",
      avatar: { animation: "idle", direction: "down", x: 192, y: 264 },
      connectionStatus: "connected",
      displayMode: "active",
      memberId,
      updatedAt: "2026-08-16T00:00:00.000Z"
    },
    status: "available",
    updatedAt: "2026-08-16T00:00:00.000Z"
  };
}
