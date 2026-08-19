import { useCallback, useEffect, useRef, useState, type JSX } from "react";

import type { LiveKitMeetingMediaTrack } from "../model/use-livekit-meeting-session";
import { MeetingMediaTrackElement } from "./MeetingMediaTrackElement";

interface MeetingAudioSinksProps {
  remoteAudioTracks: LiveKitMeetingMediaTrack[];
}

export function MeetingAudioSinks({
  remoteAudioTracks
}: MeetingAudioSinksProps): JSX.Element {
  const [isPlaybackBlocked, setIsPlaybackBlocked] = useState(false);
  const audioSinkRef = useRef<HTMLDivElement>(null);
  const handlePlaybackBlocked = useCallback(
    () => setIsPlaybackBlocked(true),
    []
  );

  useEffect(() => {
    if (!isPlaybackBlocked) {
      return;
    }

    const retryPlayback = () => {
      const audioElements = audioSinkRef.current?.querySelectorAll("audio");
      if (!audioElements?.length) {
        setIsPlaybackBlocked(false);
        return;
      }

      void Promise.all(
        Array.from(audioElements, (audioElement) => audioElement.play())
      )
        .then(() => setIsPlaybackBlocked(false))
        .catch(() => undefined);
    };

    window.addEventListener("keydown", retryPlayback, true);
    window.addEventListener("pointerdown", retryPlayback, true);

    return () => {
      window.removeEventListener("keydown", retryPlayback, true);
      window.removeEventListener("pointerdown", retryPlayback, true);
    };
  }, [isPlaybackBlocked]);

  return (
    <div
      aria-hidden="true"
      className="meeting-audio-sinks"
      ref={audioSinkRef}
    >
      {remoteAudioTracks.map((mediaTrack) => (
        <MeetingMediaTrackElement
          key={mediaTrack.id}
          mediaTrack={mediaTrack}
          onPlaybackBlocked={handlePlaybackBlocked}
        />
      ))}
    </div>
  );
}
