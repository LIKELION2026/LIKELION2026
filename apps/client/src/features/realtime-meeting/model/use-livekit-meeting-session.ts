import { useCallback, useEffect, useRef, useState } from "react";
import type { CreateMeetingTokenResponse } from "@likelion2026/shared";
import { Room, RoomEvent, Track } from "livekit-client";

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

export interface LiveKitMeetingSessionState {
  audioTrackCount: number;
  errorMessage?: string;
  isCameraEnabled: boolean;
  isCameraUpdating: boolean;
  isMicrophoneEnabled: boolean;
  isMicrophoneUpdating: boolean;
  mediaTracks: LiveKitMeetingMediaTrack[];
  participantIdentity?: string;
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
  remoteParticipantCount: 0,
  status: "idle",
  videoTrackCount: 0
};

export function useLiveKitMeetingSession(): {
  connect: (tokenResponse: CreateMeetingTokenResponse) => Promise<void>;
  disconnect: () => Promise<void>;
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
        dynacast: true
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
        .on(RoomEvent.TrackSubscribed, syncConnectedSession)
        .on(RoomEvent.TrackUnsubscribed, syncConnectedSession)
        .on(RoomEvent.TrackMuted, syncConnectedSession)
        .on(RoomEvent.TrackUnmuted, syncConnectedSession)
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
        await room.localParticipant.enableCameraAndMicrophone();
        syncSessionFromRoom(room, "connected");
      } catch (error) {
        room.removeAllListeners();
        await room.disconnect(true);
        roomRef.current = null;
        const errorMessage =
          error instanceof Error
            ? error.message
            : "LiveKit 회의방 연결에 실패했습니다.";
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
        await room.localParticipant.setCameraEnabled(enabled);
        syncSessionFromRoom(room, "connected");
      } catch (error) {
        syncSessionFromRoom(
          room,
          "connected",
          error instanceof Error ? error.message : "카메라 상태를 바꾸지 못했습니다."
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
            : "마이크 상태를 바꾸지 못했습니다."
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
    remoteParticipantCount: room.remoteParticipants.size,
    roomName: meta?.roomName ?? room.name,
    status,
    videoTrackCount: room.localParticipant.videoTrackPublications.size
  };
}

function getMediaTracks(room: Room): LiveKitMeetingMediaTrack[] {
  const mediaTracks: LiveKitMeetingMediaTrack[] = [];

  room.localParticipant.trackPublications.forEach((publication) => {
    const track = publication.track;
    if (!track || !isRenderableTrackKind(publication.kind)) {
      return;
    }

    mediaTracks.push({
      id: `local:${publication.trackSid}`,
      isLocal: true,
      isMuted: publication.isMuted,
      kind: publication.kind,
      participantIdentity: room.localParticipant.identity,
      participantName:
        room.localParticipant.name ?? room.localParticipant.identity ?? "You",
      source: publication.source,
      track
    });
  });

  room.remoteParticipants.forEach((participant) => {
    participant.trackPublications.forEach((publication) => {
      const track = publication.track;
      if (!track || !isRenderableTrackKind(publication.kind)) {
        return;
      }

      mediaTracks.push({
        id: `remote:${participant.identity}:${publication.trackSid}`,
        isLocal: false,
        isMuted: publication.isMuted,
        kind: publication.kind,
        participantIdentity: participant.identity,
        participantName: participant.name ?? participant.identity,
        source: publication.source,
        track
      });
    });
  });

  return mediaTracks;
}

function isRenderableTrackKind(
  kind: Track.Kind
): kind is Track.Kind.Audio | Track.Kind.Video {
  return kind === Track.Kind.Audio || kind === Track.Kind.Video;
}
