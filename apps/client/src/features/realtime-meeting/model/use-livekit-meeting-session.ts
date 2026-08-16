import { useCallback, useEffect, useRef, useState } from "react";
import type { CreateMeetingTokenResponse } from "@likelion2026/shared";
import { Room, RoomEvent } from "livekit-client";

export type LiveKitMeetingSessionStatus =
  | "idle"
  | "connecting"
  | "publishing"
  | "connected"
  | "reconnecting"
  | "failed"
  | "disconnected";

export interface LiveKitMeetingSessionState {
  audioTrackCount: number;
  errorMessage?: string;
  participantIdentity?: string;
  roomName?: string;
  status: LiveKitMeetingSessionStatus;
  videoTrackCount: number;
}

const INITIAL_SESSION_STATE: LiveKitMeetingSessionState = {
  audioTrackCount: 0,
  status: "idle",
  videoTrackCount: 0
};

export function useLiveKitMeetingSession(): {
  connect: (tokenResponse: CreateMeetingTokenResponse) => Promise<void>;
  disconnect: () => Promise<void>;
  session: LiveKitMeetingSessionState;
} {
  const roomRef = useRef<Room | null>(null);
  const [session, setSession] =
    useState<LiveKitMeetingSessionState>(INITIAL_SESSION_STATE);

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
    setSession({
      audioTrackCount: 0,
      roomName: room.name,
      status: "disconnected",
      videoTrackCount: 0
    });
  }, []);

  const connect = useCallback(
    async (tokenResponse: CreateMeetingTokenResponse) => {
      await disconnect();

      const room = new Room({
        adaptiveStream: true,
        dynacast: true
      });
      roomRef.current = room;

      const setConnectedState = () =>
        setSession({
          audioTrackCount: room.localParticipant.audioTrackPublications.size,
          participantIdentity: tokenResponse.participantIdentity,
          roomName: tokenResponse.roomName,
          status: "connected",
          videoTrackCount: room.localParticipant.videoTrackPublications.size
        });

      room
        .on(RoomEvent.Connected, () => {
          setSession((currentSession) => ({
            ...currentSession,
            status: "publishing"
          }));
        })
        .on(RoomEvent.Reconnecting, () => {
          setSession((currentSession) => ({
            ...currentSession,
            status: "reconnecting"
          }));
        })
        .on(RoomEvent.Reconnected, setConnectedState)
        .on(RoomEvent.LocalTrackPublished, setConnectedState)
        .on(RoomEvent.LocalTrackUnpublished, setConnectedState)
        .on(RoomEvent.Disconnected, () => {
          setSession((currentSession) => ({
            ...currentSession,
            audioTrackCount: 0,
            status: "disconnected",
            videoTrackCount: 0
          }));
        });

      setSession({
        audioTrackCount: 0,
        participantIdentity: tokenResponse.participantIdentity,
        roomName: tokenResponse.roomName,
        status: "connecting",
        videoTrackCount: 0
      });

      try {
        await room.connect(tokenResponse.serverUrl, tokenResponse.token);
        setSession((currentSession) => ({
          ...currentSession,
          status: "publishing"
        }));
        await room.localParticipant.enableCameraAndMicrophone();
        setConnectedState();
      } catch (error) {
        room.removeAllListeners();
        await room.disconnect(true);
        roomRef.current = null;
        setSession({
          audioTrackCount: 0,
          errorMessage:
            error instanceof Error
              ? error.message
              : "LiveKit 회의방 연결에 실패했습니다.",
          participantIdentity: tokenResponse.participantIdentity,
          roomName: tokenResponse.roomName,
          status: "failed",
          videoTrackCount: 0
        });
        throw error;
      }
    },
    [disconnect]
  );

  useEffect(() => {
    return () => {
      const room = roomRef.current;
      roomRef.current = null;
      room?.removeAllListeners();
      void room?.disconnect(true);
    };
  }, []);

  return { connect, disconnect, session };
}
