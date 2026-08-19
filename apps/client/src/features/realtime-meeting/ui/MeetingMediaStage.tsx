import { useState } from "react";
import type { JSX } from "react";
import { Track } from "livekit-client";

import type {
  LiveKitMeetingMediaTrack,
  LiveKitMeetingSessionState
} from "../model/use-livekit-meeting-session";
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
  const [playbackActivationToken, setPlaybackActivationToken] = useState(0);
  const [isPlaybackBlocked, setIsPlaybackBlocked] = useState(false);

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
                  {mediaTrack.isLocal ? " (나)" : ""}
                </strong>
                <span>
                  {mediaTrack.isMuted ? "카메라 꺼짐" : mediaTrack.source}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="meeting-media-empty">
          아직 표시할 카메라 영상이 없습니다.
        </div>
      )}
      <div className="meeting-audio-sinks" aria-hidden="true">
        {remoteAudioTracks.map((mediaTrack) => (
          <MeetingMediaTrackElement
            key={mediaTrack.id}
            mediaTrack={mediaTrack}
            onPlaybackBlocked={() => setIsPlaybackBlocked(true)}
            playbackActivationToken={playbackActivationToken}
          />
        ))}
      </div>
      <div className="meeting-media-controls">
        <button
          className="secondary-button"
          disabled={!canControlMedia || session.isMicrophoneUpdating}
          onClick={onMicrophoneToggle}
          type="button"
        >
          {session.isMicrophoneEnabled ? "마이크 끄기" : "마이크 켜기"}
        </button>
        <button
          className="secondary-button"
          disabled={!canControlMedia || session.isCameraUpdating}
          onClick={onCameraToggle}
          type="button"
        >
          {session.isCameraEnabled ? "카메라 끄기" : "카메라 켜기"}
        </button>
        {isPlaybackBlocked ? (
          <button
            className="secondary-button"
            onClick={() => {
              setIsPlaybackBlocked(false);
              setPlaybackActivationToken((currentToken) => currentToken + 1);
            }}
            type="button"
          >
            원격 오디오 재생
          </button>
        ) : null}
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
