import { useEffect, useState } from "react";
import {
  SOCKET_EVENT_NAMES,
  SUBTITLE_UPDATE_STRATEGY,
  type MeetingRoomSubscriptionPayload,
  type SubtitleCreatedPayload
} from "@likelion2026/shared";
import { io, type Socket } from "socket.io-client";

import { SERVER_URL } from "../../../shared/config/environment";
import { listMockSubtitles } from "../api/list-mock-subtitles";
import { filterMeetingSubtitlesAfterActivation } from "./meeting-subtitle-activation";

export type MeetingSubtitleStatus =
  | "idle"
  | "loading"
  | "subscribed"
  | "disconnected"
  | "failed";

export interface MeetingSubtitleState {
  errorMessage?: string;
  socketId?: string;
  status: MeetingSubtitleStatus;
  subtitles: SubtitleCreatedPayload[];
}

export interface MeetingSubtitleOptions {
  activatedAt?: string;
  enabled?: boolean;
  includeInitialPayloads?: boolean;
}

const INITIAL_MEETING_SUBTITLE_STATE: MeetingSubtitleState = {
  status: "idle",
  subtitles: []
};

export function useMeetingSubtitles(
  roomName: string | undefined,
  {
    activatedAt,
    enabled = Boolean(roomName),
    includeInitialPayloads = true
  }: MeetingSubtitleOptions = {}
): MeetingSubtitleState {
  const [state, setState] = useState<MeetingSubtitleState>(
    INITIAL_MEETING_SUBTITLE_STATE
  );

  useEffect(() => {
    if (!roomName || !enabled) {
      setState(INITIAL_MEETING_SUBTITLE_STATE);
      return;
    }

    let isDisposed = false;
    const socket: Socket = io(`${SERVER_URL}/meeting`, {
      reconnection: true,
      transports: ["websocket"]
    });
    const subscriptionRequest = { roomName };

    const setStateIfMounted = (
      nextState:
        | MeetingSubtitleState
        | ((currentState: MeetingSubtitleState) => MeetingSubtitleState)
    ) => {
      if (isDisposed) {
        return;
      }

      setState(nextState);
    };

    const handleConnect = () => {
      setStateIfMounted((currentState) => ({
        ...currentState,
        errorMessage: undefined,
        status:
          currentState.status === "subscribed"
            ? currentState.status
            : "loading"
      }));
      socket.emit(SOCKET_EVENT_NAMES.MEETING_ROOM_SUBSCRIBE, subscriptionRequest);
    };
    const handleDisconnect = () => {
      setStateIfMounted((currentState) => ({
        ...currentState,
        socketId: undefined,
        status: "disconnected"
      }));
    };
    const handleReconnectAttempt = () => {
      setStateIfMounted((currentState) => ({
        ...currentState,
        errorMessage: undefined,
        status: "loading"
      }));
    };
    const handleConnectError = (error: Error) => {
      setStateIfMounted((currentState) => ({
        ...currentState,
        errorMessage: error.message,
        status: "failed"
      }));
    };
    const handleRoomSubscribed = (payload: MeetingRoomSubscriptionPayload) => {
      if (payload.roomName !== roomName) {
        return;
      }

      setStateIfMounted((currentState) => ({
        ...currentState,
        errorMessage: undefined,
        socketId: payload.socketId,
        status: "subscribed"
      }));
    };
    const handleSubtitleCreated = (payload: SubtitleCreatedPayload) => {
      if (payload.roomName !== roomName) {
        return;
      }

      setStateIfMounted((currentState) => ({
        ...currentState,
        subtitles: upsertSubtitlePayloads(
          currentState.subtitles,
          filterMeetingSubtitlesAfterActivation([payload], activatedAt)
        )
      }));
    };

    setState({
      status: "loading",
      subtitles: []
    });

    if (includeInitialPayloads) {
      void loadInitialSubtitles(roomName, activatedAt, setStateIfMounted);
    }

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);
    socket.on("disconnect", handleDisconnect);
    socket.io.on("reconnect_attempt", handleReconnectAttempt);
    socket.on(SOCKET_EVENT_NAMES.MEETING_ROOM_SUBSCRIBED, handleRoomSubscribed);
    socket.on(SOCKET_EVENT_NAMES.SUBTITLE_CREATED, handleSubtitleCreated);

    return () => {
      isDisposed = true;

      if (socket.connected) {
        socket.emit(
          SOCKET_EVENT_NAMES.MEETING_ROOM_UNSUBSCRIBE,
          subscriptionRequest
        );
      }

      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
      socket.off("disconnect", handleDisconnect);
      socket.io.off("reconnect_attempt", handleReconnectAttempt);
      socket.off(SOCKET_EVENT_NAMES.MEETING_ROOM_SUBSCRIBED, handleRoomSubscribed);
      socket.off(SOCKET_EVENT_NAMES.SUBTITLE_CREATED, handleSubtitleCreated);
      socket.disconnect();
    };
  }, [activatedAt, enabled, includeInitialPayloads, roomName]);

  return state;
}

async function loadInitialSubtitles(
  roomName: string,
  activatedAt: string | undefined,
  setStateIfMounted: (
    nextState:
      | MeetingSubtitleState
      | ((currentState: MeetingSubtitleState) => MeetingSubtitleState)
  ) => void
): Promise<void> {
  try {
    const response = await listMockSubtitles(roomName);

    if (response.updateStrategy !== SUBTITLE_UPDATE_STRATEGY) {
      throw new Error("지원하지 않는 자막 업데이트 방식입니다.");
    }

    setStateIfMounted((currentState) => ({
      ...currentState,
      errorMessage: undefined,
      subtitles: upsertSubtitlePayloads(
        currentState.subtitles,
        filterMeetingSubtitlesAfterActivation(response.payloads, activatedAt)
      )
    }));
  } catch (error) {
    setStateIfMounted((currentState) => ({
      ...currentState,
      errorMessage:
        error instanceof Error
          ? error.message
          : "자막 목록을 불러오지 못했습니다.",
      status:
        currentState.status === "subscribed" ? currentState.status : "failed"
    }));
  }
}

function upsertSubtitlePayloads(
  currentSubtitles: SubtitleCreatedPayload[],
  incomingSubtitles: SubtitleCreatedPayload[]
): SubtitleCreatedPayload[] {
  const subtitleById = new Map(
    currentSubtitles.map((subtitle) => [subtitle.subtitleId, subtitle])
  );
  let didChange = false;

  incomingSubtitles.forEach((subtitle) => {
    const existingSubtitle = subtitleById.get(subtitle.subtitleId);

    if (existingSubtitle && existingSubtitle.revision > subtitle.revision) {
      return;
    }

    subtitleById.set(subtitle.subtitleId, subtitle);
    didChange = true;
  });

  if (!didChange) {
    return currentSubtitles;
  }

  return [...subtitleById.values()].sort(compareSubtitlePayloads);
}

function compareSubtitlePayloads(
  left: SubtitleCreatedPayload,
  right: SubtitleCreatedPayload
): number {
  const occurredAtDifference =
    toTimestamp(left.occurredAt) - toTimestamp(right.occurredAt);

  if (occurredAtDifference !== 0) {
    return occurredAtDifference;
  }

  return left.subtitleId.localeCompare(right.subtitleId);
}

function toTimestamp(value: string): number {
  const timestamp = Date.parse(value);

  return Number.isNaN(timestamp) ? 0 : timestamp;
}
