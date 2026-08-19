import { memo, type JSX } from "react";
import { ConnectionQuality } from "livekit-client";
import {
  Circle,
  Mic,
  MicOff,
  Video,
  VideoOff,
  type LucideIcon
} from "lucide-react";

import type { LiveKitMeetingParticipant } from "../model/use-livekit-meeting-session";
import { MeetingMediaTrackElement } from "./MeetingMediaTrackElement";

interface MeetingParticipantVideoTileProps {
  participant: LiveKitMeetingParticipant;
  variant?: "strip" | "expanded";
}

const CONNECTION_QUALITY_LABELS: Record<ConnectionQuality, string> = {
  excellent: "연결 매우 좋음",
  good: "연결 좋음",
  lost: "연결 끊김",
  poor: "연결 불안정",
  unknown: "연결 확인 중"
};

export const MeetingParticipantVideoTile = memo(
  function MeetingParticipantVideoTile({
    participant,
    variant = "strip"
  }: MeetingParticipantVideoTileProps): JSX.Element {
    const cameraStatus = getCameraStatus(participant);
    const microphoneStatus = participant.isMicrophoneEnabled
      ? "마이크 켜짐"
      : "마이크 꺼짐";
    const displayName = participant.isLocal
      ? `나 · ${participant.participantName}`
      : participant.participantName;
    const connectionStatus =
      CONNECTION_QUALITY_LABELS[participant.connectionQuality];
    const MicrophoneIcon = participant.isMicrophoneEnabled ? Mic : MicOff;
    const CameraIcon = participant.isCameraEnabled ? Video : VideoOff;

    return (
      <article
        aria-label={`${displayName}, ${cameraStatus}, ${microphoneStatus}, ${connectionStatus}`}
        className={[
          "meeting-participant-tile",
          variant,
          participant.isLocal ? "local" : "",
          participant.isSpeaking ? "speaking" : "",
          participant.isReconnecting ? "reconnecting" : ""
        ]
          .filter(Boolean)
          .join(" ")}
        role="listitem"
        title={`${displayName} · ${cameraStatus} · ${microphoneStatus} · ${connectionStatus}`}
      >
        {participant.videoTrack ? (
          <MeetingMediaTrackElement mediaTrack={participant.videoTrack} />
        ) : (
          <div className="meeting-participant-placeholder">
            <span className="sr-only">{cameraStatus}</span>
          </div>
        )}

        <div aria-hidden="true" className="meeting-participant-icon-overlay">
          <span
            className={[
              "meeting-status-icon",
              participant.isMicrophoneEnabled ? "on" : "off"
            ].join(" ")}
          >
            <ParticipantStatusIcon icon={MicrophoneIcon} />
          </span>
          <span
            className={[
              "meeting-status-icon",
              participant.isCameraEnabled ? "on" : "off"
            ].join(" ")}
          >
            <ParticipantStatusIcon icon={CameraIcon} />
          </span>
          <Circle
            className={[
              "meeting-connection-dot",
              getConnectionTone(participant.connectionQuality)
            ].join(" ")}
            size={12}
            strokeWidth={3}
          />
        </div>

        {participant.isSpeaking ? (
          <Circle
            aria-hidden="true"
            className="meeting-participant-speaking-icon"
            size={16}
            strokeWidth={3}
          />
        ) : null}
      </article>
    );
  }
);

function ParticipantStatusIcon({
  icon: Icon
}: {
  icon: LucideIcon;
}): JSX.Element {
  return (
    <Icon
      aria-hidden="true"
      className="meeting-status-svg"
      size={16}
      strokeWidth={2.35}
    />
  );
}

function getCameraStatus(participant: LiveKitMeetingParticipant): string {
  if (!participant.isCameraEnabled) {
    return "카메라 꺼짐";
  }

  if (!participant.videoTrack) {
    return "영상 준비 중";
  }

  return "영상 켜짐";
}

function getConnectionTone(quality: ConnectionQuality): "good" | "bad" {
  return quality === ConnectionQuality.Excellent ||
    quality === ConnectionQuality.Good
    ? "good"
    : "bad";
}
