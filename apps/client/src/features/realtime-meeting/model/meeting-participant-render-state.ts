import type { LiveKitMeetingParticipant } from "./use-livekit-meeting-session";

export function hasSameMeetingParticipantTileState(
  left: LiveKitMeetingParticipant,
  right: LiveKitMeetingParticipant
): boolean {
  return (
    left.connectionQuality === right.connectionQuality &&
    left.identity === right.identity &&
    left.isCameraEnabled === right.isCameraEnabled &&
    left.isLocal === right.isLocal &&
    left.isMicrophoneEnabled === right.isMicrophoneEnabled &&
    left.isReconnecting === right.isReconnecting &&
    left.isSpeaking === right.isSpeaking &&
    left.participantName === right.participantName &&
    getMeetingParticipantVideoTrackRenderKey(left) ===
      getMeetingParticipantVideoTrackRenderKey(right)
  );
}

function getMeetingParticipantVideoTrackRenderKey(
  participant: LiveKitMeetingParticipant
): string {
  const videoTrack = participant.videoTrack;

  if (!videoTrack) {
    return "none";
  }

  return [
    videoTrack.id,
    videoTrack.isMuted ? "muted" : "unmuted",
    videoTrack.isLocal ? "local" : "remote",
    videoTrack.kind,
    videoTrack.source
  ].join(":");
}
