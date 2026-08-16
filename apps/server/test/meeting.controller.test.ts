import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SOCKET_EVENT_NAMES,
  SUBTITLE_UPDATE_STRATEGY,
  type CreateMockSubtitleRequest
} from "@likelion2026/shared";
import type { LiveKitWebhookService } from "../src/integrations/livekit/livekit-webhook.service";
import type { MeetingRealtimeGateway } from "../src/modules/meeting/meeting-realtime.gateway";
import { MeetingController } from "../src/modules/meeting/meeting.controller";
import type { MeetingService } from "../src/modules/meeting/meeting.service";

test("getRoomState delegates to the meeting service state lookup", () => {
  const roomName = "lab-likelion-20260816-state";
  const controller = new MeetingController(
    {} as LiveKitWebhookService,
    createMeetingRealtimeGatewayStub(),
    {
      getExistingRoomState(inputRoomName: string) {
        assert.equal(inputRoomName, roomName);

        return {
          lastEvent: "participant_joined",
          participantCount: 1,
          participants: [
            {
              participantIdentity: "tester-1",
              publishedTrackSids: []
            }
          ],
          roomName,
          status: "active",
          trackCount: 0,
          updatedAt: "2026-08-16T00:00:00.000Z"
        };
      }
    } as unknown as MeetingService
  );

  assert.equal(controller.getRoomState(roomName).roomName, roomName);
});

test("createMockSubtitle delegates to the meeting service mock source", () => {
  const roomName = "lab-likelion-20260816-subtitle";
  const realtimeGateway = createMeetingRealtimeGatewayStub();
  const controller = new MeetingController(
    {} as LiveKitWebhookService,
    realtimeGateway,
    {
      createMockSubtitle(input: CreateMockSubtitleRequest) {
        assert.equal(input.roomName, roomName);

        return {
          eventName: SOCKET_EVENT_NAMES.SUBTITLE_CREATED,
          payload: {
            isFinal: false,
            occurredAt: "2026-08-16T00:00:00.000Z",
            revision: 1,
            roomName,
            sourceLanguage: "ko",
            sourceText: "원문",
            speaker: {
              displayName: "Tester",
              participantIdentity: "tester-1"
            },
            subtitleId: "segment-1",
            translatedLanguage: "en",
            translatedText: "Source"
          }
        };
      }
    } as unknown as MeetingService
  );

  const response = controller.createMockSubtitle({
    roomName,
    sourceLanguage: "ko",
    sourceText: "원문",
    speaker: {
      displayName: "Tester",
      participantIdentity: "tester-1"
    },
    translatedLanguage: "en",
    translatedText: "Source"
  });

  assert.equal(response.eventName, SOCKET_EVENT_NAMES.SUBTITLE_CREATED);
  assert.equal(response.payload.roomName, roomName);
  assert.equal(realtimeGateway.publishedPayloads[0]?.roomName, roomName);
});

test("getMockSubtitles delegates to the meeting service subtitle buffer", () => {
  const roomName = "lab-likelion-20260816-subtitle";
  const controller = new MeetingController(
    {} as LiveKitWebhookService,
    createMeetingRealtimeGatewayStub(),
    {
      getMockSubtitles(inputRoomName: string) {
        assert.equal(inputRoomName, roomName);

        return {
          eventName: SOCKET_EVENT_NAMES.SUBTITLE_CREATED,
          payloads: [
            {
              isFinal: true,
              occurredAt: "2026-08-16T00:00:00.000Z",
              revision: 2,
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
            }
          ],
          roomName,
          updateStrategy: SUBTITLE_UPDATE_STRATEGY
        };
      }
    } as unknown as MeetingService
  );

  const response = controller.getMockSubtitles(roomName);

  assert.equal(response.updateStrategy, SUBTITLE_UPDATE_STRATEGY);
  assert.equal(response.payloads[0]?.subtitleId, "segment-1");
});

function createMeetingRealtimeGatewayStub(): MeetingRealtimeGateway & {
  publishedPayloads: Array<{ roomName: string }>;
} {
  const publishedPayloads: Array<{ roomName: string }> = [];

  return {
    publishedPayloads,
    publishSubtitle(payload: { roomName: string }) {
      publishedPayloads.push(payload);
    }
  } as MeetingRealtimeGateway & {
    publishedPayloads: Array<{ roomName: string }>;
  };
}
