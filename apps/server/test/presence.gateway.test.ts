import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SOCKET_EVENT_NAMES,
  type OfficeSummonRequestedPayload,
  type OfficeTodosUpdatedPayload
} from "@likelion2026/shared";

import { PresenceGateway } from "../src/modules/presence/presence.gateway";

test("publishTodosUpdated emits an office todo update to the workspace room", () => {
  const gateway = new PresenceGateway({} as never);
  const server = createFakeServer();
  const payload: OfficeTodosUpdatedPayload = {
    memberId: "member-1",
    occurredAt: "2026-08-17T00:00:00.000Z",
    teamId: "workspace-1"
  };

  setGatewayServer(gateway, server);
  gateway.publishTodosUpdated(payload);

  assert.deepEqual(server.sent, [
    {
      eventName: SOCKET_EVENT_NAMES.OFFICE_TODOS_UPDATED,
      payload,
      roomName: "office:workspace-1"
    }
  ]);
});

test("handleOfficeSummonRequest sends the requester identity to the selected teammate", () => {
  const gateway = new PresenceGateway({
    findConnectedMember: (memberId: string, teamId: string) =>
      memberId === "member-target" && teamId === "workspace-1"
        ? {
            member: { displayName: "An", memberId },
            socketId: "socket-target"
          }
        : null,
    getConnection: (socketId: string) =>
      socketId === "socket-requester"
        ? {
            member: { displayName: "민지", memberId: "member-requester" },
            teamId: "workspace-1"
          }
        : null
  } as never);
  const server = createFakeServer();

  setGatewayServer(gateway, server);
  gateway.handleOfficeSummonRequest(
    asSocket({ id: "socket-requester" }),
    { targetMemberId: "member-target" }
  );

  assert.equal(server.sent[0]?.eventName, SOCKET_EVENT_NAMES.OFFICE_SUMMON_REQUESTED);
  assert.equal(server.sent[0]?.roomName, "socket-target");
  assert.equal((server.sent[0]?.payload as OfficeSummonRequestedPayload).requesterName, "민지");
});

test("accepted summon resolves with the requester's latest position", () => {
  const requester = {
    avatar: { animation: "idle" as const, direction: "right" as const, x: 640, y: 320 },
    displayName: "민지",
    memberId: "member-requester"
  };
  const target = { displayName: "An", memberId: "member-target" };
  const presenceService = {
    findConnectedMember: (memberId: string, teamId: string) =>
      memberId === "member-target" && teamId === "workspace-1"
        ? { member: target, socketId: "socket-target", teamId }
        : null,
    getConnection: (socketId: string) => {
      if (socketId === "socket-requester") {
        return { member: requester, socketId, teamId: "workspace-1" };
      }
      if (socketId === "socket-target") {
        return { member: target, socketId, teamId: "workspace-1" };
      }
      return null;
    }
  };
  const gateway = new PresenceGateway(presenceService as never);
  const server = createFakeServer();
  setGatewayServer(gateway, server);

  gateway.handleOfficeSummonRequest(
    asSocket({ id: "socket-requester" }),
    { targetMemberId: "member-target" }
  );
  const requestId = (server.sent[0]?.payload as OfficeSummonRequestedPayload).requestId;

  gateway.handleOfficeSummonRespond(
    asSocket({ id: "socket-target" }),
    { decision: "accepted", requestId }
  );

  assert.deepEqual(
    server.sent.map((event) => event.eventName),
    [
      SOCKET_EVENT_NAMES.OFFICE_SUMMON_REQUESTED,
      SOCKET_EVENT_NAMES.OFFICE_SUMMON_RESOLVED,
      SOCKET_EVENT_NAMES.OFFICE_SUMMON_RESOLVED
    ]
  );

  const resolution = server.sent.find(
    (event) => event.eventName === SOCKET_EVENT_NAMES.OFFICE_SUMMON_RESOLVED
  )?.payload as {
    decision: string;
    requestId: string;
    targetPosition?: { x: number; y: number };
  };
  assert.equal(resolution.decision, "accepted");
  assert.match(resolution.requestId, /^[a-f0-9-]{36}$/);
  assert.deepEqual(resolution.targetPosition, requester.avatar);
});

function createFakeServer(): {
  sent: Array<{
    eventName: string;
    payload: unknown;
    roomName: string;
  }>;
  to(roomName: string): {
    emit(eventName: string, payload: unknown): void;
  };
} {
  const server = {
    sent: [] as Array<{
      eventName: string;
      payload: unknown;
      roomName: string;
    }>,
    to(roomName: string) {
      return {
        emit(eventName: string, payload: unknown) {
          server.sent.push({ eventName, payload, roomName });
        }
      };
    }
  };

  return server;
}

function asSocket(client: { id: string }) {
  return client as never;
}

function setGatewayServer(
  gateway: PresenceGateway,
  server: ReturnType<typeof createFakeServer>
): void {
  (gateway as unknown as { server: ReturnType<typeof createFakeServer> }).server = server;
}
