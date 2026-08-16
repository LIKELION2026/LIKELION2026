import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SOCKET_EVENT_NAMES,
  type SubtitleCreatedPayload
} from "@likelion2026/shared";
import { WsException } from "@nestjs/websockets";
import type { Socket } from "socket.io";

import { MeetingRealtimeGateway } from "../src/modules/meeting/meeting-realtime.gateway";

test("handleRoomSubscribe joins the socket.io room and returns a subscribed event", () => {
  const gateway = new MeetingRealtimeGateway();
  const client = createFakeClient();

  const response = gateway.handleRoomSubscribe(
    { roomName: "lab-likelion-20260816-subtitle" },
    asSocket(client)
  );

  assert.deepEqual(client.joinedRooms, [
    "meeting:lab-likelion-20260816-subtitle"
  ]);
  assert.equal(response.event, SOCKET_EVENT_NAMES.MEETING_ROOM_SUBSCRIBED);
  assert.equal(response.data.roomName, "lab-likelion-20260816-subtitle");
  assert.equal(response.data.socketId, "socket-1");
});

test("handleRoomUnsubscribe leaves the socket.io room and returns an unsubscribed event", () => {
  const gateway = new MeetingRealtimeGateway();
  const client = createFakeClient();

  const response = gateway.handleRoomUnsubscribe(
    { roomName: "lab-likelion-20260816-subtitle" },
    asSocket(client)
  );

  assert.deepEqual(client.leftRooms, [
    "meeting:lab-likelion-20260816-subtitle"
  ]);
  assert.equal(response.event, SOCKET_EVENT_NAMES.MEETING_ROOM_UNSUBSCRIBED);
  assert.equal(response.data.roomName, "lab-likelion-20260816-subtitle");
});

test("handleRoomSubscribe rejects room names outside the lab policy", () => {
  const gateway = new MeetingRealtimeGateway();
  const client = createFakeClient();

  assert.throws(
    () =>
      gateway.handleRoomSubscribe({ roomName: "prod-room" }, asSocket(client)),
    WsException
  );
});

test("publishSubtitle emits subtitle.created to the room subscribers", () => {
  const gateway = new MeetingRealtimeGateway();
  const server = createFakeServer();
  const payload = createSubtitlePayload();

  setGatewayServer(gateway, server);
  gateway.publishSubtitle(payload);

  assert.deepEqual(server.sent, [
    {
      eventName: SOCKET_EVENT_NAMES.SUBTITLE_CREATED,
      payload,
      roomName: "meeting:lab-likelion-20260816-subtitle"
    }
  ]);
});

function createSubtitlePayload(): SubtitleCreatedPayload {
  return {
    isFinal: false,
    occurredAt: "2026-08-16T00:00:00.000Z",
    revision: 1,
    roomName: "lab-likelion-20260816-subtitle",
    sourceLanguage: "ko",
    sourceText: "Source",
    speaker: {
      displayName: "Tester",
      participantIdentity: "tester-1"
    },
    subtitleId: "segment-1",
    translatedLanguage: "en",
    translatedText: "Translated"
  };
}

function createFakeClient(): {
  id: string;
  joinedRooms: string[];
  leftRooms: string[];
  join(roomName: string): void;
  leave(roomName: string): void;
} {
  return {
    id: "socket-1",
    joinedRooms: [],
    leftRooms: [],
    join(roomName: string) {
      this.joinedRooms.push(roomName);
    },
    leave(roomName: string) {
      this.leftRooms.push(roomName);
    }
  };
}

function asSocket(client: ReturnType<typeof createFakeClient>): Socket {
  return client as unknown as Socket;
}

function createFakeServer(): {
  sent: Array<{
    eventName: string;
    payload: SubtitleCreatedPayload;
    roomName: string;
  }>;
  to(roomName: string): {
    emit(eventName: string, payload: SubtitleCreatedPayload): void;
  };
} {
  const server = {
    sent: [] as Array<{
      eventName: string;
      payload: SubtitleCreatedPayload;
      roomName: string;
    }>,
    to(roomName: string) {
      return {
        emit(eventName: string, payload: SubtitleCreatedPayload) {
          server.sent.push({
            eventName,
            payload,
            roomName
          });
        }
      };
    }
  };

  return server;
}

function setGatewayServer(
  gateway: MeetingRealtimeGateway,
  server: ReturnType<typeof createFakeServer>
): void {
  (
    gateway as unknown as {
      server: ReturnType<typeof createFakeServer>;
    }
  ).server = server;
}
