import { useState, type JSX } from "react";
import { Volume2 } from "lucide-react";

import type { LiveKitMeetingMediaTrack } from "../model/use-livekit-meeting-session";
import { MeetingMediaTrackElement } from "./MeetingMediaTrackElement";

interface MeetingAudioSinksProps {
  playbackButtonClassName?: string;
  playbackButtonLabel?: string;
  remoteAudioTracks: LiveKitMeetingMediaTrack[];
}

export function MeetingAudioSinks({
  playbackButtonClassName = "secondary-button",
  playbackButtonLabel = "원격 오디오 재생",
  remoteAudioTracks
}: MeetingAudioSinksProps): JSX.Element {
  const [playbackActivationToken, setPlaybackActivationToken] = useState(0);
  const [isPlaybackBlocked, setIsPlaybackBlocked] = useState(false);

  return (
    <>
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
      {isPlaybackBlocked ? (
        <button
          className={playbackButtonClassName}
          onClick={() => {
            setIsPlaybackBlocked(false);
            setPlaybackActivationToken((currentToken) => currentToken + 1);
          }}
          title={playbackButtonLabel}
          type="button"
        >
          <Volume2
            aria-hidden="true"
            className="meeting-control-icon"
            size={23}
            strokeWidth={2.35}
          />
          <span className="sr-only">{playbackButtonLabel}</span>
        </button>
      ) : null}
    </>
  );
}
