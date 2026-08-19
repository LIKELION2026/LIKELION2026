import { useEffect, useRef } from "react";
import type { JSX } from "react";
import { Track } from "livekit-client";

import type { LiveKitMeetingMediaTrack } from "../model/use-livekit-meeting-session";

interface MeetingMediaTrackElementProps {
  mediaTrack: LiveKitMeetingMediaTrack;
  onPlaybackBlocked?: () => void;
}

export function MeetingMediaTrackElement({
  mediaTrack,
  onPlaybackBlocked
}: MeetingMediaTrackElementProps): JSX.Element {
  if (mediaTrack.kind === Track.Kind.Audio) {
    return (
      <MeetingAudioTrackElement
        mediaTrack={mediaTrack}
        onPlaybackBlocked={onPlaybackBlocked}
      />
    );
  }

  return <MeetingVideoTrackElement mediaTrack={mediaTrack} />;
}

function MeetingVideoTrackElement({
  mediaTrack
}: MeetingMediaTrackElementProps): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      return;
    }

    mediaTrack.track.attach(videoElement);
    videoElement.muted = mediaTrack.isLocal;
    void videoElement.play().catch(() => undefined);

    return () => {
      mediaTrack.track.detach(videoElement);
    };
  }, [mediaTrack.isLocal, mediaTrack.track]);

  return (
    <video
      autoPlay
      className="meeting-media-video"
      muted={mediaTrack.isLocal}
      playsInline
      ref={videoRef}
    />
  );
}

function MeetingAudioTrackElement({
  mediaTrack,
  onPlaybackBlocked
}: MeetingMediaTrackElementProps): JSX.Element {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) {
      return;
    }

    mediaTrack.track.attach(audioElement);
    void audioElement.play().catch(() => onPlaybackBlocked?.());

    return () => {
      mediaTrack.track.detach(audioElement);
    };
  }, [mediaTrack.track, onPlaybackBlocked]);

  return <audio autoPlay ref={audioRef} />;
}
