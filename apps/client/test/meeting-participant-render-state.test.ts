import assert from "node:assert/strict";
import test from "node:test";
import { ConnectionQuality, Track, type Track as LiveKitTrack } from "livekit-client";

import { hasSameMeetingParticipantTileState } from "../src/features/realtime-meeting/model/meeting-participant-render-state.ts";
import type { LiveKitMeetingParticipant } from "../src/features/realtime-meeting/model/use-livekit-meeting-session.ts";

const videoTrack = {
  id: "remote:alice:camera-track",
  isLocal: false,
  isMuted: false,
  kind: Track.Kind.Video,
  participantIdentity: "alice",
  participantName: "Alice",
  source: Track.Source.Camera,
  track: {} as LiveKitTrack
};

function participant(
  overrides: Partial<LiveKitMeetingParticipant> = {}
): LiveKitMeetingParticipant {
  return {
    connectionQuality: ConnectionQuality.Good,
    identity: "alice",
    isCameraEnabled: true,
    isLocal: false,
    isMicrophoneEnabled: true,
    isReconnecting: false,
    isSpeaking: false,
    participantName: "Alice",
    videoTrack,
    ...overrides
  };
}

test("treats recreated participant objects with the same visible state as equal", () => {
  assert.equal(
    hasSameMeetingParticipantTileState(participant(), participant()),
    true
  );
});

test("detects participant tile render state changes", () => {
  assert.equal(
    hasSameMeetingParticipantTileState(
      participant(),
      participant({ isSpeaking: true })
    ),
    false
  );
  assert.equal(
    hasSameMeetingParticipantTileState(
      participant(),
      participant({
        videoTrack: {
          ...videoTrack,
          id: "remote:alice:new-camera-track"
        }
      })
    ),
    false
  );
});
