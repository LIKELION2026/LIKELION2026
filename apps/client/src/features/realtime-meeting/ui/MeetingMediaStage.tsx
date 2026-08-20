import type { JSX } from "react";
import { Track } from "livekit-client";
import { useTranslation } from "react-i18next";

import type {
  LiveKitMeetingMediaTrack,
  LiveKitMeetingSessionState
} from "../model/use-livekit-meeting-session";
import { MeetingAudioSinks } from "./MeetingAudioSinks";
import { MeetingMediaTrackElement } from "./MeetingMediaTrackElement";

interface MeetingMediaStageProps {
  canControlMedia: boolean;
  onCameraToggle: () => void;
  onMicrophoneToggle: () => void;
  remoteAudioTracks: LiveKitMeetingMediaTrack[];
  session: LiveKitMeetingSessionState;
  videoTracks: LiveKitMeetingMediaTrack[];
}

export function MeetingMediaStage({
  canControlMedia,
  onCameraToggle,
  onMicrophoneToggle,
  remoteAudioTracks,
  session,
  videoTracks
}: MeetingMediaStageProps): JSX.Element | null {
  const { t } = useTranslation();

  if (session.status === "idle" || session.status === "failed") {
    return null;
  }

  return (
    <div className="meeting-media-stage">
      {videoTracks.length > 0 ? (
        <div className="meeting-media-grid">
          {videoTracks.map((mediaTrack) => (
            <article className="meeting-media-tile" key={mediaTrack.id}>
              <MeetingMediaTrackElement mediaTrack={mediaTrack} />
              <div className="meeting-media-overlay">
                <strong>
                  {mediaTrack.participantName}
                  {mediaTrack.isLocal ? t("meetingMedia.localSuffix") : ""}
                </strong>
                <span>
                  {mediaTrack.isMuted ? t("meetingMedia.cameraDisabled") : mediaTrack.source}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="meeting-media-empty">
          {t("meetingMedia.empty")}
        </div>
      )}
      <MeetingAudioSinks remoteAudioTracks={remoteAudioTracks} />
      <div className="meeting-media-controls">
        <button
          className="secondary-button"
          disabled={!canControlMedia || session.isMicrophoneUpdating}
          onClick={onMicrophoneToggle}
          type="button"
        >
          {session.isMicrophoneEnabled
            ? t("meetingMedia.microphoneDisable")
            : t("meetingMedia.microphoneEnable")}
        </button>
        <button
          className="secondary-button"
          disabled={!canControlMedia || session.isCameraUpdating}
          onClick={onCameraToggle}
          type="button"
        >
          {session.isCameraEnabled
            ? t("meetingMedia.cameraDisable")
            : t("meetingMedia.cameraEnable")}
        </button>
      </div>
    </div>
  );
}

export function splitMeetingMediaTracks(
  mediaTracks: LiveKitMeetingMediaTrack[]
): {
  remoteAudioTracks: LiveKitMeetingMediaTrack[];
  videoTracks: LiveKitMeetingMediaTrack[];
} {
  return {
    remoteAudioTracks: mediaTracks.filter(
      (mediaTrack) =>
        mediaTrack.kind === Track.Kind.Audio && !mediaTrack.isLocal
    ),
    videoTracks: mediaTracks.filter(
      (mediaTrack) => mediaTrack.kind === Track.Kind.Video
    )
  };
}
