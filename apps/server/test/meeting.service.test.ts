import assert from "node:assert/strict";
import { test } from "node:test";

import { BadRequestException, NotFoundException } from "@nestjs/common";
import {
  SOCKET_EVENT_NAMES,
  SUBTITLE_UPDATE_STRATEGY,
  type CreateMockSubtitleRequest
} from "@likelion2026/shared";

import type { LiveKitTokenService } from "../src/integrations/livekit/livekit-token.service";
import { MeetingService } from "../src/modules/meeting/meeting.service";

interface CapturedTokenRequest {
  attributes?: Record<string, string>;
  participantIdentity: string;
  participantName: string;
  roomName: string;
}

class FakeLiveKitTokenService {
  readonly requests: CapturedTokenRequest[] = [];
  readonly serverUrl = "wss://example.livekit.cloud";

  async createRoomJoinToken(input: CapturedTokenRequest): Promise<{
    expiresAt: string;
    token: string;
  }> {
    this.requests.push(input);

    return {
      expiresAt: "2026-08-16T00:00:00.000Z",
      token: `token-for-${input.roomName}`
    };
  }
}

test("createToken trims loginless token input and derives participant policy", async () => {
  const fakeLiveKitTokenService = new FakeLiveKitTokenService();
  const service = new MeetingService(
    fakeLiveKitTokenService as unknown as LiveKitTokenService
  );

  const response = await service.createToken({
    participantCountry: "vn",
    participantName: " Tester ",
    roomName: " lab-likelion-20260816-test "
  });

  assert.equal(response.serverUrl, "wss://example.livekit.cloud");
  assert.equal(response.token, "token-for-lab-likelion-20260816-test");
  assert.equal(response.roomName, "lab-likelion-20260816-test");
  assert.match(response.participantIdentity, /^vn-guest-[a-f0-9-]{36}$/);
  assert.equal(response.participantName, "Tester");
  assert.equal(response.participantCountry, "vn");
  assert.equal(response.preferredLanguage, "vi");
  assert.deepEqual(fakeLiveKitTokenService.requests, [
    {
      attributes: {
        participantCountry: "vn",
        preferredLanguage: "vi",
        roomName: "lab-likelion-20260816-test"
      },
      participantIdentity: response.participantIdentity,
      participantName: "Tester",
      roomName: "lab-likelion-20260816-test"
    }
  ]);
});

test("createToken derives Korea participant language and identity", async () => {
  const fakeLiveKitTokenService = new FakeLiveKitTokenService();
  const service = new MeetingService(
    fakeLiveKitTokenService as unknown as LiveKitTokenService
  );

  const response = await service.createToken({
    participantCountry: "kr",
    participantName: "Guest",
    roomName: "lab-likelion-20260816-guest"
  });

  assert.match(response.participantIdentity, /^kr-guest-[a-f0-9-]{36}$/);
  assert.equal(response.participantCountry, "kr");
  assert.equal(response.preferredLanguage, "ko");
  assert.equal(
    fakeLiveKitTokenService.requests[0]?.participantIdentity,
    response.participantIdentity
  );
  assert.equal(
    fakeLiveKitTokenService.requests[0]?.attributes?.preferredLanguage,
    "ko"
  );
});

test("createToken rejects non-lab room names", async () => {
  const service = new MeetingService(
    new FakeLiveKitTokenService() as unknown as LiveKitTokenService
  );

  await assert.rejects(
    () =>
      service.createToken({
        participantCountry: "kr",
        participantName: "Tester",
        roomName: "random-room"
      }),
    (error: unknown) => error instanceof BadRequestException
  );
});

test("createToken rejects unsupported participant countries", async () => {
  const service = new MeetingService(
    new FakeLiveKitTokenService() as unknown as LiveKitTokenService
  );

  await assert.rejects(
    () =>
      service.createToken({
        participantCountry: "jp" as never,
        participantName: "Tester",
        roomName: "lab-likelion-20260816-test"
      }),
    (error: unknown) => error instanceof BadRequestException
  );
});

test("createToken rejects blank participant names", async () => {
  const service = new MeetingService(
    new FakeLiveKitTokenService() as unknown as LiveKitTokenService
  );

  await assert.rejects(
    () =>
      service.createToken({
        participantCountry: "kr",
        participantName: " ",
        roomName: "lab-likelion-20260816-test"
      }),
    (error: unknown) => error instanceof BadRequestException
  );
});

test("createMockSubtitle returns a subtitle.created payload with defaults", () => {
  const service = new MeetingService(
    new FakeLiveKitTokenService() as unknown as LiveKitTokenService
  );

  const response = service.createMockSubtitle({
    roomName: " lab-likelion-20260816-subtitle ",
    sourceLanguage: "ko",
    sourceText: " 이번 배포는 금요일입니다. ",
    speaker: {
      displayName: " Tester ",
      participantIdentity: " tester-1 "
    },
    translatedLanguage: "en",
    translatedText: " The deployment is on Friday. "
  });

  assert.equal(response.eventName, SOCKET_EVENT_NAMES.SUBTITLE_CREATED);
  assert.match(response.payload.subtitleId, /^mock-[a-f0-9-]{36}$/);
  assert.equal(response.payload.roomName, "lab-likelion-20260816-subtitle");
  assert.equal(response.payload.speaker.participantIdentity, "tester-1");
  assert.equal(response.payload.speaker.displayName, "Tester");
  assert.equal(response.payload.sourceText, "이번 배포는 금요일입니다.");
  assert.equal(response.payload.translatedText, "The deployment is on Friday.");
  assert.equal(response.payload.isFinal, false);
  assert.equal(response.payload.revision, 1);
  assert.match(response.payload.occurredAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("createMockSubtitle preserves explicit final subtitle metadata", () => {
  const service = new MeetingService(
    new FakeLiveKitTokenService() as unknown as LiveKitTokenService
  );

  const response = service.createMockSubtitle({
    confidence: 0.87,
    isFinal: true,
    occurredAt: "2026-08-16T00:00:00.000Z",
    revision: 2,
    roomName: "lab-likelion-20260816-subtitle",
    sourceLanguage: "en",
    sourceText: "Please review the blocker.",
    speaker: {
      displayName: "Tester",
      participantIdentity: "tester-1"
    },
    subtitleId: "segment-1",
    translatedLanguage: "ko",
    translatedText: "블로커를 검토해 주세요."
  });

  assert.deepEqual(response, {
    eventName: SOCKET_EVENT_NAMES.SUBTITLE_CREATED,
    payload: {
      confidence: 0.87,
      isFinal: true,
      occurredAt: "2026-08-16T00:00:00.000Z",
      revision: 2,
      roomName: "lab-likelion-20260816-subtitle",
      sourceLanguage: "en",
      sourceText: "Please review the blocker.",
      speaker: {
        displayName: "Tester",
        participantIdentity: "tester-1"
      },
      subtitleId: "segment-1",
      translatedLanguage: "ko",
      translatedText: "블로커를 검토해 주세요."
    }
  });
});

test("getMockSubtitles returns stored mock subtitles for a lab room", () => {
  const service = new MeetingService(
    new FakeLiveKitTokenService() as unknown as LiveKitTokenService
  );
  const roomName = "lab-likelion-20260816-subtitle";

  const firstResponse = service.createMockSubtitle({
    occurredAt: "2026-08-16T00:00:01.000Z",
    roomName,
    sourceLanguage: "en",
    sourceText: "First",
    speaker: {
      displayName: "Tester",
      participantIdentity: "tester-1"
    },
    subtitleId: "segment-1",
    translatedLanguage: "ko",
    translatedText: "First translated"
  });
  const secondResponse = service.createMockSubtitle({
    occurredAt: "2026-08-16T00:00:02.000Z",
    roomName,
    sourceLanguage: "en",
    sourceText: "Second",
    speaker: {
      displayName: "Tester",
      participantIdentity: "tester-1"
    },
    subtitleId: "segment-2",
    translatedLanguage: "ko",
    translatedText: "Second translated"
  });

  assert.deepEqual(service.getMockSubtitles(roomName), {
    eventName: SOCKET_EVENT_NAMES.SUBTITLE_CREATED,
    payloads: [firstResponse.payload, secondResponse.payload],
    roomName,
    updateStrategy: SUBTITLE_UPDATE_STRATEGY
  });
});

test("getMockSubtitles keeps the latest revision for each subtitle id", () => {
  const service = new MeetingService(
    new FakeLiveKitTokenService() as unknown as LiveKitTokenService
  );
  const roomName = "lab-likelion-20260816-subtitle";
  const baseRequest: CreateMockSubtitleRequest = {
    roomName,
    sourceLanguage: "en",
    sourceText: "Draft",
    speaker: {
      displayName: "Tester",
      participantIdentity: "tester-1"
    },
    subtitleId: "segment-1",
    translatedLanguage: "ko",
    translatedText: "Draft translated"
  };

  const finalResponse = service.createMockSubtitle({
    ...baseRequest,
    isFinal: true,
    revision: 2,
    sourceText: "Final",
    translatedText: "Final translated"
  });
  service.createMockSubtitle({
    ...baseRequest,
    revision: 1
  });

  const listResponse = service.getMockSubtitles(roomName);

  assert.equal(listResponse.payloads.length, 1);
  assert.deepEqual(listResponse.payloads[0], finalResponse.payload);
});

test("getMockSubtitles returns an empty list for valid rooms without subtitles", () => {
  const service = new MeetingService(
    new FakeLiveKitTokenService() as unknown as LiveKitTokenService
  );
  const roomName = "lab-likelion-20260816-empty";

  assert.deepEqual(service.getMockSubtitles(roomName), {
    eventName: SOCKET_EVENT_NAMES.SUBTITLE_CREATED,
    payloads: [],
    roomName,
    updateStrategy: SUBTITLE_UPDATE_STRATEGY
  });
});

test("handleLiveKitWebhook clears mock subtitles when a room finishes", () => {
  const service = new MeetingService(
    new FakeLiveKitTokenService() as unknown as LiveKitTokenService
  );
  const roomName = "lab-likelion-20260816-subtitle";

  service.createMockSubtitle({
    roomName,
    sourceLanguage: "en",
    sourceText: "Final",
    speaker: {
      displayName: "Tester",
      participantIdentity: "tester-1"
    },
    subtitleId: "segment-1",
    translatedLanguage: "ko",
    translatedText: "Final translated"
  });

  assert.equal(service.getMockSubtitles(roomName).payloads.length, 1);

  service.handleLiveKitWebhook({
    event: "room_finished",
    id: "EV_room_finished",
    roomName
  });

  assert.deepEqual(service.getMockSubtitles(roomName), {
    eventName: SOCKET_EVENT_NAMES.SUBTITLE_CREATED,
    payloads: [],
    roomName,
    updateStrategy: SUBTITLE_UPDATE_STRATEGY
  });
});

test("createMockSubtitle rejects invalid mock subtitle input", () => {
  const service = new MeetingService(
    new FakeLiveKitTokenService() as unknown as LiveKitTokenService
  );
  const validRequest: CreateMockSubtitleRequest = {
    roomName: "lab-likelion-20260816-subtitle",
    sourceLanguage: "ko",
    sourceText: "원문",
    speaker: {
      displayName: "Tester",
      participantIdentity: "tester-1"
    },
    translatedLanguage: "en",
    translatedText: "Source"
  };

  assert.throws(
    () =>
      service.createMockSubtitle({
        ...validRequest,
        sourceLanguage: "ja"
      } as unknown as CreateMockSubtitleRequest),
    (error: unknown) => error instanceof BadRequestException
  );
  assert.throws(
    () =>
      service.createMockSubtitle({
        ...validRequest,
        sourceText: " "
      }),
    (error: unknown) => error instanceof BadRequestException
  );
  assert.throws(
    () =>
      service.createMockSubtitle({
        ...validRequest,
        revision: 0
      }),
    (error: unknown) => error instanceof BadRequestException
  );
});

test("handleLiveKitWebhook acknowledges summarized LiveKit events", () => {
  const service = new MeetingService(
    new FakeLiveKitTokenService() as unknown as LiveKitTokenService
  );

  const response = service.handleLiveKitWebhook({
    event: "participant_joined",
    participantIdentity: "tester-1",
    roomName: "lab-likelion-20260816-test"
  });

  assert.deepEqual(response, {
    duplicate: false,
    event: "participant_joined",
    participantIdentity: "tester-1",
    received: true,
    roomName: "lab-likelion-20260816-test",
    roomState: {
      lastEvent: "participant_joined",
      lastEventId: undefined,
      participantCount: 1,
      participants: [
        {
          participantIdentity: "tester-1",
          participantName: undefined,
          publishedTrackSids: []
        }
      ],
      roomName: "lab-likelion-20260816-test",
      roomSid: undefined,
      status: "active",
      trackCount: 0,
      updatedAt: response.roomState?.updatedAt
    }
  });
});

test("handleLiveKitWebhook updates room state from participant and track events", () => {
  const service = new MeetingService(
    new FakeLiveKitTokenService() as unknown as LiveKitTokenService
  );
  const roomName = "lab-likelion-20260816-state";

  service.handleLiveKitWebhook({
    event: "room_started",
    id: "EV_room_started",
    roomName,
    roomSid: "RM_state"
  });
  service.handleLiveKitWebhook({
    event: "participant_joined",
    participantIdentity: "tester-1",
    participantName: "Tester",
    roomName,
    roomSid: "RM_state"
  });
  const response = service.handleLiveKitWebhook({
    event: "track_published",
    participantIdentity: "tester-1",
    participantName: "Tester",
    roomName,
    roomSid: "RM_state",
    trackSid: "TR_camera"
  });

  assert.deepEqual(response.roomState, {
    lastEvent: "track_published",
    lastEventId: undefined,
    participantCount: 1,
    participants: [
      {
        participantIdentity: "tester-1",
        participantName: "Tester",
        publishedTrackSids: ["TR_camera"]
      }
    ],
    roomName,
    roomSid: "RM_state",
    status: "active",
    trackCount: 1,
    updatedAt: response.roomState?.updatedAt
  });
  assert.deepEqual(service.getRoomState(roomName), response.roomState);
});

test("getExistingRoomState returns the current room state for lab rooms", () => {
  const service = new MeetingService(
    new FakeLiveKitTokenService() as unknown as LiveKitTokenService
  );
  const roomName = "lab-likelion-20260816-state";

  const response = service.handleLiveKitWebhook({
    event: "participant_joined",
    participantIdentity: "tester-1",
    roomName
  });

  assert.deepEqual(service.getExistingRoomState(roomName), response.roomState);
});

test("getExistingRoomState rejects non-lab room names", () => {
  const service = new MeetingService(
    new FakeLiveKitTokenService() as unknown as LiveKitTokenService
  );

  assert.throws(
    () => service.getExistingRoomState("random-room"),
    (error: unknown) => error instanceof BadRequestException
  );
});

test("getExistingRoomState returns not found for unknown lab rooms", () => {
  const service = new MeetingService(
    new FakeLiveKitTokenService() as unknown as LiveKitTokenService
  );

  assert.throws(
    () => service.getExistingRoomState("lab-likelion-20260816-missing"),
    (error: unknown) => error instanceof NotFoundException
  );
});

test("handleLiveKitWebhook removes unpublished tracks and departed participants", () => {
  const service = new MeetingService(
    new FakeLiveKitTokenService() as unknown as LiveKitTokenService
  );
  const roomName = "lab-likelion-20260816-state";

  service.handleLiveKitWebhook({
    event: "track_published",
    participantIdentity: "tester-1",
    participantName: "Tester",
    roomName,
    trackSid: "TR_camera"
  });
  const unpublishedResponse = service.handleLiveKitWebhook({
    event: "track_unpublished",
    participantIdentity: "tester-1",
    roomName,
    trackSid: "TR_camera"
  });

  assert.equal(unpublishedResponse.roomState?.trackCount, 0);
  assert.deepEqual(
    unpublishedResponse.roomState?.participants[0]?.publishedTrackSids,
    []
  );

  const leftResponse = service.handleLiveKitWebhook({
    event: "participant_left",
    participantIdentity: "tester-1",
    roomName
  });

  assert.equal(leftResponse.roomState?.participantCount, 0);
  assert.deepEqual(leftResponse.roomState?.participants, []);
});

test("handleLiveKitWebhook marks rooms finished and clears participants", () => {
  const service = new MeetingService(
    new FakeLiveKitTokenService() as unknown as LiveKitTokenService
  );
  const roomName = "lab-likelion-20260816-state";

  service.handleLiveKitWebhook({
    event: "participant_joined",
    participantIdentity: "tester-1",
    roomName
  });
  const response = service.handleLiveKitWebhook({
    event: "room_finished",
    id: "EV_room_finished",
    roomName
  });

  assert.equal(response.roomState?.status, "finished");
  assert.equal(response.roomState?.lastEvent, "room_finished");
  assert.equal(response.roomState?.lastEventId, "EV_room_finished");
  assert.equal(response.roomState?.participantCount, 0);
  assert.equal(response.roomState?.trackCount, 0);
});

test("handleLiveKitWebhook acknowledges events without room state when room is absent", () => {
  const service = new MeetingService(
    new FakeLiveKitTokenService() as unknown as LiveKitTokenService
  );

  const response = service.handleLiveKitWebhook({
    event: "egress_started",
    id: "EV_no_room"
  });

  assert.deepEqual(response, {
    duplicate: false,
    event: "egress_started",
    participantIdentity: undefined,
    received: true,
    roomName: undefined,
    roomState: undefined
  });
});

test("handleLiveKitWebhook ignores duplicate LiveKit event ids", () => {
  const service = new MeetingService(
    new FakeLiveKitTokenService() as unknown as LiveKitTokenService
  );
  const roomName = "lab-likelion-20260816-idempotency";

  const firstResponse = service.handleLiveKitWebhook({
    event: "track_published",
    id: "EV_duplicate",
    participantIdentity: "tester-1",
    participantName: "Tester",
    roomName,
    trackSid: "TR_camera"
  });
  const duplicateResponse = service.handleLiveKitWebhook({
    event: "track_published",
    id: "EV_duplicate",
    participantIdentity: "tester-1",
    participantName: "Tester",
    roomName,
    trackSid: "TR_camera"
  });

  assert.equal(firstResponse.duplicate, false);
  assert.equal(duplicateResponse.duplicate, true);
  assert.deepEqual(duplicateResponse.roomState, firstResponse.roomState);
  assert.deepEqual(service.getRoomState(roomName), firstResponse.roomState);
});

test("handleLiveKitWebhook still processes events without ids", () => {
  const service = new MeetingService(
    new FakeLiveKitTokenService() as unknown as LiveKitTokenService
  );
  const roomName = "lab-likelion-20260816-idempotency";

  service.handleLiveKitWebhook({
    event: "participant_joined",
    participantIdentity: "tester-1",
    roomName
  });
  const response = service.handleLiveKitWebhook({
    event: "participant_left",
    participantIdentity: "tester-1",
    roomName
  });

  assert.equal(response.duplicate, false);
  assert.equal(response.roomState?.participantCount, 0);
});
