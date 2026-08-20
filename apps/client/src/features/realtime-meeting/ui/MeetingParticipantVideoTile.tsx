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
import { useTranslation } from "react-i18next";

import type { LiveKitMeetingParticipant } from "../model/use-livekit-meeting-session";
import { hasSameMeetingParticipantTileState } from "../model/meeting-participant-render-state";
import { MeetingMediaTrackElement } from "./MeetingMediaTrackElement";

interface MeetingParticipantVideoTileProps {
  participant: LiveKitMeetingParticipant;
  variant?: "strip" | "expanded";
}

export const MeetingParticipantVideoTile = memo(
  function MeetingParticipantVideoTile({
    participant,
    variant = "strip"
  }: MeetingParticipantVideoTileProps): JSX.Element {
    const { t } = useTranslation();
    const cameraStatus = t(getCameraStatusKey(participant));
    const microphoneStatus = participant.isMicrophoneEnabled
      ? t("meetingParticipants.microphone.enabled")
      : t("meetingParticipants.microphone.disabled");
    const displayName = participant.isLocal
      ? t("meetingParticipants.localPrefix", {
          name: participant.participantName
        })
      : participant.participantName;
    const connectionStatus =
      t(`meetingParticipants.connectionQuality.${participant.connectionQuality}`);
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
  },
  (previousProps, nextProps) =>
    previousProps.variant === nextProps.variant &&
    hasSameMeetingParticipantTileState(
      previousProps.participant,
      nextProps.participant
    )
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

function getCameraStatusKey(participant: LiveKitMeetingParticipant): string {
  if (!participant.isCameraEnabled) {
    return "meetingParticipants.video.disabled";
  }

  if (!participant.videoTrack) {
    return "meetingParticipants.video.preparing";
  }

  return "meetingParticipants.video.enabled";
}

function getConnectionTone(quality: ConnectionQuality): "good" | "bad" {
  return quality === ConnectionQuality.Excellent ||
    quality === ConnectionQuality.Good
    ? "good"
    : "bad";
}
