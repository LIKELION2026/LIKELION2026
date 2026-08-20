import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SOCKET_EVENT_NAMES,
  type OfficeChatMessagePayload,
  type OfficeMeetingSummaryReadyPayload,
  type OfficeSummonRequestedPayload,
  type OfficeTodosUpdatedPayload
} from "@likelion2026/shared";

import { PresenceGateway } from "../src/modules/presence/presence.gateway";
import { OfficeChatTranslationService } from "../src/modules/presence/office-chat-translation.service";

test("publishTodosUpdated emits an office todo update to the workspace room", () => {
  const gateway = createGateway({} as never);
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

test("publishMeetingSummaryReady emits only to connected meeting participants", () => {
  const gateway = createGateway({
    findConnectedMember: (memberId: string, teamId: string) => {
      if (teamId !== "workspace-1") {
        return null;
      }
      if (memberId === "member-1") {
        return { member: { memberId }, socketId: "socket-1" };
      }
      if (memberId === "member-2") {
        return { member: { memberId }, socketId: "socket-2" };
      }
      return null;
    }
  } as never);
  const server = createFakeServer();
  const eventPayload: OfficeMeetingSummaryReadyPayload = {
    eventId: "event-1",
    occurredAt: "2026-08-21T00:00:00.000Z",
    teamId: "workspace-1"
  };

  setGatewayServer(gateway, server);
  gateway.publishMeetingSummaryReady({
    ...eventPayload,
    participantMemberIds: ["member-1", "member-offline", "member-2"]
  });

  assert.deepEqual(server.sent, [
    {
      eventName: SOCKET_EVENT_NAMES.OFFICE_MEETING_SUMMARY_READY,
      payload: eventPayload,
      roomName: "socket-1"
    },
    {
      eventName: SOCKET_EVENT_NAMES.OFFICE_MEETING_SUMMARY_READY,
      payload: eventPayload,
      roomName: "socket-2"
    }
  ]);
});

test("handleOfficeChatSend relays a trimmed message only to the sender workspace", async () => {
  const gateway = createGateway({
    getConnection: (socketId: string) =>
      socketId === "socket-sender"
        ? {
            member: {
              displayName: "민지",
              language: "ko",
              memberId: "member-sender"
            },
            teamId: "workspace-1"
          }
        : null
  } as never);
  const server = createFakeServer();
  setGatewayServer(gateway, server);

  await gateway.handleOfficeChatSend(asSocket({ id: "socket-sender" }), {
    text: "  안녕하세요  "
  });

  assert.equal(server.sent[0]?.eventName, SOCKET_EVENT_NAMES.OFFICE_CHAT_MESSAGE);
  assert.equal(server.sent[0]?.roomName, "office:workspace-1");
  const payload = server.sent[0]?.payload as OfficeChatMessagePayload;
  assert.equal(payload.displayName, "민지");
  assert.equal(payload.memberId, "member-sender");
  assert.equal(payload.sourceLanguage, "ko");
  assert.equal(payload.text, "안녕하세요");
  assert.deepEqual(payload.translations, { vi: "Xin chào." });
});

test("handleOfficeChatSend attaches Korean translations for Vietnamese office chat", async () => {
  const gateway = createGateway({
    getConnection: () => ({
      member: {
        displayName: "Linh",
        language: "vi",
        memberId: "member-sender"
      },
      teamId: "workspace-1"
    })
  } as never);
  const server = createFakeServer();
  setGatewayServer(gateway, server);

  await gateway.handleOfficeChatSend(asSocket({ id: "socket-sender" }), {
    text: "Xin chào"
  });

  const payload = server.sent[0]?.payload as OfficeChatMessagePayload;
  assert.equal(payload.sourceLanguage, "vi");
  assert.deepEqual(payload.translations, { ko: "안녕하세요." });
});

test("handleOfficeChatSend detects Vietnamese text even when the sender selected Korean", async () => {
  const gateway = createGateway({
    getConnection: () => ({
      member: {
        displayName: "민지",
        language: "ko",
        memberId: "member-sender"
      },
      teamId: "workspace-1"
    })
  } as never);
  const server = createFakeServer();
  setGatewayServer(gateway, server);

  await gateway.handleOfficeChatSend(asSocket({ id: "socket-sender" }), {
    text: "Cảm ơn"
  });

  const payload = server.sent[0]?.payload as OfficeChatMessagePayload;
  assert.equal(payload.sourceLanguage, "vi");
  assert.deepEqual(payload.translations, { ko: "감사합니다." });
});

test("handleOfficeChatSend rejects blank and oversized messages", async () => {
  const gateway = createGateway({
    getConnection: () => ({
      member: { displayName: "민지", language: "ko", memberId: "member-sender" },
      teamId: "workspace-1"
    })
  } as never);
  const server = createFakeServer();
  setGatewayServer(gateway, server);

  await gateway.handleOfficeChatSend(asSocket({ id: "socket-sender" }), {
    text: "   "
  });
  await gateway.handleOfficeChatSend(asSocket({ id: "socket-sender" }), {
    text: "a".repeat(161)
  });

  assert.equal(server.sent.length, 0);
});

test("handleOfficeSummonRequest sends the requester identity to the selected teammate", () => {
  const gateway = createGateway({
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
  const gateway = createGateway(presenceService as never);
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

function createGateway(presenceService: never): PresenceGateway {
  return new PresenceGateway(presenceService, new OfficeChatTranslationService());
}

function setGatewayServer(
  gateway: PresenceGateway,
  server: ReturnType<typeof createFakeServer>
): void {
  (gateway as unknown as { server: ReturnType<typeof createFakeServer> }).server = server;
}
