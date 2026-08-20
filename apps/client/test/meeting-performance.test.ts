import assert from "node:assert/strict";
import test from "node:test";

import {
  MEETING_CAMERA_CAPTURE_OPTIONS,
  MEETING_CAMERA_MAX_FRAMERATE,
  MEETING_CAMERA_PUBLISH_OPTIONS,
  MEETING_RENDERED_PARTICIPANT_LIMIT,
  selectMeetingParticipantPreviews
} from "../src/features/realtime-meeting/model/meeting-performance.ts";

test("uses a 720p 15fps camera profile for six-person meetings", () => {
  assert.equal(MEETING_CAMERA_CAPTURE_OPTIONS.resolution?.width, 1280);
  assert.equal(MEETING_CAMERA_CAPTURE_OPTIONS.resolution?.height, 720);
  assert.equal(
    MEETING_CAMERA_CAPTURE_OPTIONS.resolution?.frameRate,
    MEETING_CAMERA_MAX_FRAMERATE
  );
  assert.deepEqual(MEETING_CAMERA_CAPTURE_OPTIONS.frameRate, {
    ideal: MEETING_CAMERA_MAX_FRAMERATE,
    max: MEETING_CAMERA_MAX_FRAMERATE
  });
  assert.equal(
    MEETING_CAMERA_PUBLISH_OPTIONS.videoEncoding?.maxFramerate,
    MEETING_CAMERA_MAX_FRAMERATE
  );
  assert.equal(MEETING_CAMERA_PUBLISH_OPTIONS.simulcast, true);
  assert.equal(MEETING_CAMERA_PUBLISH_OPTIONS.videoSimulcastLayers?.length, 2);
});

test("keeps collapsed participant previews to the P0 render budget", () => {
  const participants = Array.from({ length: MEETING_RENDERED_PARTICIPANT_LIMIT + 2 }, (_, index) => ({
    identity: `guest-${index}`,
    isLocal: index === 7,
    isSpeaking: index === 6
  }));

  const previews = selectMeetingParticipantPreviews(participants);

  assert.equal(previews.length, MEETING_RENDERED_PARTICIPANT_LIMIT);
  assert.equal(previews[0]?.identity, "guest-7");
  assert.equal(previews[1]?.identity, "guest-6");
  assert.equal(previews.some((participant) => participant.identity === "guest-0"), true);
  assert.equal(previews.some((participant) => participant.identity === "guest-1"), true);
});
