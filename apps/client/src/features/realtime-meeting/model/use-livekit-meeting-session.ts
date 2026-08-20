import { useCallback, useEffect, useRef, useState } from "react";
import type { CreateMeetingTokenResponse } from "@likelion2026/shared";
import {
  ConnectionQuality,
  Room,
  RoomEvent,
  Track,
  type Participant,
  type TrackPublication
} from "livekit-client";

import {
  MEETING_CAMERA_CAPTURE_OPTIONS,
  MEETING_CAMERA_PUBLISH_OPTIONS
} from "./meeting-performance";

export type LiveKitMeetingSessionStatus =
  | "idle"
  | "connecting"
  | "publishing"
  | "connected"
  | "reconnecting"
  | "failed"
  | "disconnected";

export interface LiveKitMeetingMediaTrack {
  id: string;
  isLocal: boolean;
  isMuted: boolean;
  kind: Track.Kind.Audio | Track.Kind.Video;
  participantIdentity: string;
  participantName: string;
  source: Track.Source;
  track: Track;
}

export interface LiveKitMeetingParticipant {
  connectionQuality: ConnectionQuality;
  identity: string;
  isCameraEnabled: boolean;
  isLocal: boolean;
  isMicrophoneEnabled: boolean;
  isReconnecting: boolean;
  isSpeaking: boolean;
  participantName: string;
  videoTrack?: LiveKitMeetingMediaTrack;
}

export interface LiveKitMeetingSessionState {
  audioTrackCount: number;
  errorMessage?: string;
  isCameraEnabled: boolean;
  isCameraUpdating: boolean;
  isMicrophoneEnabled: boolean;
  isMicrophoneUpdating: boolean;
  mediaTracks: LiveKitMeetingMediaTrack[];
  participantIdentity?: string;
  participants: LiveKitMeetingParticipant[];
  remoteParticipantCount: number;
  roomName?: string;
  status: LiveKitMeetingSessionStatus;
  videoTrackCount: number;
}

interface LiveKitMeetingSessionMeta {
  participantIdentity: string;
  roomName: string;
}

const INITIAL_SESSION_STATE: LiveKitMeetingSessionState = {
  audioTrackCount: 0,
  isCameraEnabled: false,
  isCameraUpdating: false,
  isMicrophoneEnabled: false,
  isMicrophoneUpdating: false,
  mediaTracks: [],
  participants: [],
  remoteParticipantCount: 0,
  status: "idle",
  videoTrackCount: 0
};

export function useLiveKitMeetingSession(): {
  connect: (tokenResponse: CreateMeetingTokenResponse) => Promise<void>;
  disconnect: () => Promise<void>;
  room: Room | null;
  session: LiveKitMeetingSessionState;
  setCameraEnabled: (enabled: boolean) => Promise<void>;
  setMicrophoneEnabled: (enabled: boolean) => Promise<void>;
} {
  const roomRef = useRef<Room | null>(null);
  const sessionMetaRef = useRef<LiveKitMeetingSessionMeta | null>(null);
  const [session, setSession] =
    useState<LiveKitMeetingSessionState>(INITIAL_SESSION_STATE);

  const syncSessionFromRoom = useCallback(
    (
      room: Room,
      status?: LiveKitMeetingSessionStatus,
      errorMessage?: string
    ) => {
      const meta = sessionMetaRef.current;

      setSession((currentSession) =>
        createSessionStateFromRoom(
          room,
          meta,
          status ?? currentSession.status,
          errorMessage
        )
      );
    },
    []
  );

  const disconnect = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;

    if (!room) {
      setSession((currentSession) => ({
        ...currentSession,
        status:
          currentSession.status === "idle" ? currentSession.status : "disconnected"
      }));
      return;
    }

    room.removeAllListeners();
    await room.disconnect(true);
    setSession((currentSession) => ({
      ...INITIAL_SESSION_STATE,
      participantIdentity: currentSession.participantIdentity,
      roomName: currentSession.roomName ?? room.name,
      status: "disconnected"
    }));
  }, []);

  const connect = useCallback(
    async (tokenResponse: CreateMeetingTokenResponse) => {
      await disconnect();

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: MEETING_CAMERA_PUBLISH_OPTIONS,
        videoCaptureDefaults: MEETING_CAMERA_CAPTURE_OPTIONS
      });
      roomRef.current = room;
      sessionMetaRef.current = {
        participantIdentity: tokenResponse.participantIdentity,
        roomName: tokenResponse.roomName
      };

      const syncConnectedSession = () => {
        syncSessionFromRoom(room);
      };
      const syncPublishingSession = () => {
        syncSessionFromRoom(room, "publishing");
      };

      room
        .on(RoomEvent.Connected, syncPublishingSession)
        .on(RoomEvent.Reconnecting, () => {
          syncSessionFromRoom(room, "reconnecting");
        })
        .on(RoomEvent.Reconnected, () => {
          syncSessionFromRoom(room, "connected");
        })
        .on(RoomEvent.ParticipantConnected, syncConnectedSession)
        .on(RoomEvent.ParticipantDisconnected, syncConnectedSession)
        .on(RoomEvent.ParticipantNameChanged, syncConnectedSession)
        .on(RoomEvent.ActiveSpeakersChanged, syncConnectedSession)
        .on(RoomEvent.ConnectionQualityChanged, syncConnectedSession)
        .on(RoomEvent.TrackPublished, syncConnectedSession)
        .on(RoomEvent.TrackUnpublished, syncConnectedSession)
        .on(RoomEvent.TrackSubscribed, syncConnectedSession)
        .on(RoomEvent.TrackUnsubscribed, syncConnectedSession)
        .on(RoomEvent.TrackMuted, syncConnectedSession)
        .on(RoomEvent.TrackUnmuted, syncConnectedSession)
        .on(RoomEvent.TrackStreamStateChanged, syncConnectedSession)
        .on(RoomEvent.TrackSubscriptionStatusChanged, syncConnectedSession)
        .on(RoomEvent.LocalTrackPublished, syncConnectedSession)
        .on(RoomEvent.LocalTrackUnpublished, syncConnectedSession)
        .on(RoomEvent.Disconnected, () => {
          setSession((currentSession) => ({
            ...currentSession,
            audioTrackCount: 0,
            isCameraEnabled: false,
            isCameraUpdating: false,
            isMicrophoneEnabled: false,
            isMicrophoneUpdating: false,
            mediaTracks: [],
            participants: [],
            remoteParticipantCount: 0,
            status: "disconnected",
            videoTrackCount: 0
          }));
        });

      setSession({
        ...INITIAL_SESSION_STATE,
        participantIdentity: tokenResponse.participantIdentity,
        roomName: tokenResponse.roomName,
        status: "connecting"
      });

      try {
        await room.connect(tokenResponse.serverUrl, tokenResponse.token);
        syncSessionFromRoom(room, "publishing");
        await Promise.all([
          room.localParticipant.setCameraEnabled(
            true,
            MEETING_CAMERA_CAPTURE_OPTIONS,
            MEETING_CAMERA_PUBLISH_OPTIONS
          ),
          room.localParticipant.setMicrophoneEnabled(true)
        ]);
        syncSessionFromRoom(room, "connected");
      } catch (error) {
        room.removeAllListeners();
        await room.disconnect(true);
        roomRef.current = null;
        const errorMessage =
          error instanceof Error
            ? error.message
            : "meetingErrors.liveKitConnectionFailed";
        setSession({
          ...INITIAL_SESSION_STATE,
          errorMessage,
          participantIdentity: tokenResponse.participantIdentity,
          roomName: tokenResponse.roomName,
          status: "failed"
        });
        throw error;
      }
    },
    [disconnect, syncSessionFromRoom]
  );

  const setCameraEnabled = useCallback(
    async (enabled: boolean) => {
      const room = roomRef.current;
      if (!room) {
        return;
      }

      setSession((currentSession) => ({
        ...currentSession,
        errorMessage: undefined,
        isCameraUpdating: true
      }));

      try {
        await room.localParticipant.setCameraEnabled(
          enabled,
          enabled ? MEETING_CAMERA_CAPTURE_OPTIONS : undefined,
          enabled ? MEETING_CAMERA_PUBLISH_OPTIONS : undefined
        );
        syncSessionFromRoom(room, "connected");
      } catch (error) {
        syncSessionFromRoom(
          room,
          "connected",
          error instanceof Error ? error.message : "meetingErrors.cameraToggleFailed"
        );
      }
    },
    [syncSessionFromRoom]
  );

  const setMicrophoneEnabled = useCallback(
    async (enabled: boolean) => {
      const room = roomRef.current;
      if (!room) {
        return;
      }

      setSession((currentSession) => ({
        ...currentSession,
        errorMessage: undefined,
        isMicrophoneUpdating: true
      }));

      try {
        await room.localParticipant.setMicrophoneEnabled(enabled);
        syncSessionFromRoom(room, "connected");
      } catch (error) {
        syncSessionFromRoom(
          room,
          "connected",
          error instanceof Error
            ? error.message
            : "meetingErrors.microphoneToggleFailed"
        );
      }
    },
    [syncSessionFromRoom]
  );

  useEffect(() => {
    return () => {
      const room = roomRef.current;
      roomRef.current = null;
      room?.removeAllListeners();
      void room?.disconnect(true);
    };
  }, []);

  return {
    connect,
    disconnect,
    room: roomRef.current,
    session,
    setCameraEnabled,
    setMicrophoneEnabled
  };
}

function createSessionStateFromRoom(
  room: Room,
  meta: LiveKitMeetingSessionMeta | null,
  status: LiveKitMeetingSessionStatus,
  errorMessage?: string
): LiveKitMeetingSessionState {
  const microphonePublication = room.localParticipant.getTrackPublication(
    Track.Source.Microphone
  );
  const cameraPublication = room.localParticipant.getTrackPublication(
    Track.Source.Camera
  );

  return {
    audioTrackCount: room.localParticipant.audioTrackPublications.size,
    errorMessage,
    isCameraEnabled: Boolean(cameraPublication && !cameraPublication.isMuted),
    isCameraUpdating: false,
    isMicrophoneEnabled: Boolean(
      microphonePublication && !microphonePublication.isMuted
    ),
    isMicrophoneUpdating: false,
    mediaTracks: getMediaTracks(room),
    participantIdentity: meta?.participantIdentity ?? room.localParticipant.identity,
    participants: getMeetingParticipants(room),
    remoteParticipantCount: room.remoteParticipants.size,
    roomName: meta?.roomName ?? room.name,
    status,
    videoTrackCount: room.localParticipant.videoTrackPublications.size
  };
}

function getMediaTracks(room: Room): LiveKitMeetingMediaTrack[] {
  const mediaTracks: LiveKitMeetingMediaTrack[] = [];

  room.localParticipant.trackPublications.forEach((publication) => {
    const mediaTrack = createMediaTrackFromPublication(
      room.localParticipant,
      publication,
      true
    );
    if (mediaTrack) {
      mediaTracks.push(mediaTrack);
    }
  });

  room.remoteParticipants.forEach((participant) => {
    participant.trackPublications.forEach((publication) => {
      const mediaTrack = createMediaTrackFromPublication(
        participant,
        publication,
        false
      );
      if (mediaTrack) {
        mediaTracks.push(mediaTrack);
      }
    });
  });

  return mediaTracks;
}

function getMeetingParticipants(room: Room): LiveKitMeetingParticipant[] {
  return [
    createMeetingParticipant(room.localParticipant, true),
    ...Array.from(room.remoteParticipants.values()).map((participant) =>
      createMeetingParticipant(participant, false)
    )
  ];
}

function createMeetingParticipant(
  participant: Participant,
  isLocal: boolean
): LiveKitMeetingParticipant {
  const cameraPublication = participant.getTrackPublication(
    Track.Source.Camera
  );
  const microphonePublication = participant.getTrackPublication(
    Track.Source.Microphone
  );
  const videoTrack = createMediaTrackFromPublication(
    participant,
    cameraPublication,
    isLocal
  );

  return {
    connectionQuality: participant.connectionQuality,
    identity: participant.identity,
    isCameraEnabled: Boolean(cameraPublication && !cameraPublication.isMuted),
    isLocal,
    isMicrophoneEnabled: Boolean(
      microphonePublication && !microphonePublication.isMuted
    ),
    isReconnecting: participant.connectionQuality === ConnectionQuality.Lost,
    isSpeaking: participant.isSpeaking,
    participantName: getParticipantName(participant, isLocal),
    videoTrack: videoTrack?.kind === Track.Kind.Video ? videoTrack : undefined
  };
}

function createMediaTrackFromPublication(
  participant: Participant,
  publication: TrackPublication | undefined,
  isLocal: boolean
): LiveKitMeetingMediaTrack | undefined {
  const track = publication?.track;
  if (!publication || !track || !isRenderableTrackKind(publication.kind)) {
    return undefined;
  }

  if (publication.isMuted) {
    return undefined;
  }

  return {
    id: `${isLocal ? "local" : "remote"}:${participant.identity}:${
      publication.trackSid
    }`,
    isLocal,
    isMuted: publication.isMuted,
    kind: publication.kind,
    participantIdentity: participant.identity,
    participantName: getParticipantName(participant, isLocal),
    source: publication.source,
    track
  };
}

function getParticipantName(participant: Participant, isLocal: boolean): string {
  return participant.name ?? participant.identity ?? (isLocal ? "local" : "participant");
}

function isRenderableTrackKind(
  kind: Track.Kind
): kind is Track.Kind.Audio | Track.Kind.Video {
  return kind === Track.Kind.Audio || kind === Track.Kind.Video;
}
