import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeMeetingSessionJoinRequest,
  shouldIgnoreMeetingSessionStart
} from "../src/features/realtime-meeting/model/meeting-session-join-request.ts";

test("normalizes join request fields and omits a blank participant identity", () => {
  assert.deepEqual(
    normalizeMeetingSessionJoinRequest({
      participantCountry: "kr",
      participantIdentity: " member-123 ",
      participantName: " Demo Member ",
      roomName: " lab-likelion-20260819-meeting-room "
    }),
    {
      participantCountry: "kr",
      participantIdentity: "member-123",
      participantName: "Demo Member",
      roomName: "lab-likelion-20260819-meeting-room"
    }
  );

  assert.deepEqual(
    normalizeMeetingSessionJoinRequest({
      participantCountry: "vn",
      participantIdentity: " ",
      participantName: " Demo Member ",
      roomName: " lab-likelion-20260819-meeting-room "
    }),
    {
      participantCountry: "vn",
      participantName: "Demo Member",
      roomName: "lab-likelion-20260819-meeting-room"
    }
  );
});

test("ignores duplicate start requests unless the previous attempt failed", () => {
  const request = {
    participantCountry: "kr" as const,
    participantIdentity: "member-123",
    participantName: "Demo Member",
    roomName: "lab-likelion-20260819-meeting-room"
  };

  assert.equal(shouldIgnoreMeetingSessionStart(request, request, "idle"), true);
  assert.equal(
    shouldIgnoreMeetingSessionStart(request, request, "requesting-permission"),
    true
  );
  assert.equal(
    shouldIgnoreMeetingSessionStart(request, request, "connected"),
    true
  );
  assert.equal(
    shouldIgnoreMeetingSessionStart(request, request, "leaving"),
    true
  );
  assert.equal(
    shouldIgnoreMeetingSessionStart(request, request, "failed"),
    false
  );
  assert.equal(
    shouldIgnoreMeetingSessionStart(
      request,
      { ...request, participantIdentity: "member-456" },
      "connected"
    ),
    false
  );
});
