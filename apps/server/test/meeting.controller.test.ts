import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SOCKET_EVENT_NAMES,
  SUBTITLE_UPDATE_STRATEGY,
  type CreateMockSubtitleRequest,
  type OfficeCalendarUpdatedPayload,
  type OfficeMeetingSummaryReadyPayload
} from "@likelion2026/shared";
import type { LiveKitWebhookService } from "../src/integrations/livekit/livekit-webhook.service";
import type { MeetingRealtimeGateway } from "../src/modules/meeting/meeting-realtime.gateway";
import { MeetingController as MeetingControllerUnderTest } from "../src/modules/meeting/meeting.controller";
import type { MeetingService } from "../src/modules/meeting/meeting.service";
import type { PresenceGateway } from "../src/modules/presence/presence.gateway";

class MeetingController extends MeetingControllerUnderTest {
  constructor(
    liveKitWebhookService: LiveKitWebhookService,
    meetingRealtimeGateway: MeetingRealtimeGateway,
    meetingService: MeetingService,
    presenceGateway: PresenceGateway = createPresenceGatewayStub()
  ) {
    super(
      liveKitWebhookService,
      meetingRealtimeGateway,
      meetingService,
      presenceGateway
    );
  }
}

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

test("submitSummary publishes calendar and summary-ready office events", async () => {
  const presenceGateway = createPresenceGatewayRecorder();
  const controller = new MeetingController(
    {} as LiveKitWebhookService,
    createMeetingRealtimeGatewayStub(),
    {
      async submitSummary() {
        return {
          endsAt: "2026-08-21T00:30:00.000Z",
          eventType: "meeting",
          id: "event-1",
          isAllDay: false,
          participantMemberIds: ["member-1", "member-2"],
          startsAt: "2026-08-21T00:00:00.000Z",
          title: "회의 요약",
          workspaceId: "workspace-1"
        };
      }
    } as unknown as MeetingService,
    presenceGateway
  );

  const response = await controller.submitSummary({
    endsAt: "2026-08-21T00:30:00.000Z",
    everParticipantIdentities: ["member-1", "member-2"],
    roomName: "lab-likelion-20260821-summary",
    startsAt: "2026-08-21T00:00:00.000Z",
    summaryKo: "요약",
    summaryVi: "Tom tat"
  });

  assert.deepEqual(response, { accepted: true, eventId: "event-1" });
  assert.equal(presenceGateway.calendarUpdates.length, 1);
  assert.equal(presenceGateway.calendarUpdates[0]?.teamId, "workspace-1");
  assert.equal(presenceGateway.summaryReadyUpdates.length, 1);
  assert.equal(presenceGateway.summaryReadyUpdates[0]?.eventId, "event-1");
  assert.deepEqual(presenceGateway.summaryReadyUpdates[0]?.participantMemberIds, [
    "member-1",
    "member-2"
  ]);
  assert.equal(presenceGateway.summaryReadyUpdates[0]?.teamId, "workspace-1");
  assert.ok(Date.parse(presenceGateway.summaryReadyUpdates[0]?.occurredAt ?? ""));
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

function createPresenceGatewayStub(): PresenceGateway {
  return {
    publishCalendarUpdated() {
      return undefined;
    },
    publishMeetingSummaryReady() {
      return undefined;
    }
  } as unknown as PresenceGateway;
}

function createPresenceGatewayRecorder(): PresenceGateway & {
  calendarUpdates: OfficeCalendarUpdatedPayload[];
  summaryReadyUpdates: Array<
    OfficeMeetingSummaryReadyPayload & { participantMemberIds: string[] }
  >;
} {
  const calendarUpdates: OfficeCalendarUpdatedPayload[] = [];
  const summaryReadyUpdates: Array<
    OfficeMeetingSummaryReadyPayload & { participantMemberIds: string[] }
  > = [];

  return {
    calendarUpdates,
    publishCalendarUpdated(payload: OfficeCalendarUpdatedPayload) {
      calendarUpdates.push(payload);
    },
    publishMeetingSummaryReady(
      payload: OfficeMeetingSummaryReadyPayload & { participantMemberIds: string[] }
    ) {
      summaryReadyUpdates.push(payload);
    },
    summaryReadyUpdates
  } as unknown as PresenceGateway & {
    calendarUpdates: OfficeCalendarUpdatedPayload[];
    summaryReadyUpdates: Array<
      OfficeMeetingSummaryReadyPayload & { participantMemberIds: string[] }
    >;
  };
}
