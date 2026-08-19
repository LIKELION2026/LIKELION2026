import { useCallback, useEffect, useRef, useState } from "react";
import {
  MEETING_PARTICIPANT_LANGUAGE_BY_COUNTRY,
  type CreateMeetingTokenResponse
} from "@likelion2026/shared";
import type { Room } from "livekit-client";

import { createMeetingToken } from "../api/create-meeting-token";
import {
  checkMeetingDevicePreflight,
  INITIAL_MEETING_DEVICE_PREFLIGHT_STATE,
  type MeetingDevicePreflightState
} from "./device-preflight";
import {
  getMeetingSessionControllerTransition,
  type MeetingSessionControllerEvent,
  type MeetingSessionControllerStatus
} from "./meeting-session-transition";
import {
  normalizeMeetingSessionJoinRequest,
  shouldIgnoreMeetingSessionStart,
  type MeetingSessionJoinRequest
} from "./meeting-session-join-request";
import { createDefaultMeetingTranslationPreference } from "./meeting-translation-preference";
import {
  useLiveKitMeetingSession,
  type LiveKitMeetingSessionState
} from "./use-livekit-meeting-session";

export interface MeetingSessionController {
  activeJoinRequest: MeetingSessionJoinRequest | null;
  checkDevices: () => Promise<MeetingDevicePreflightState>;
  devicePreflight: MeetingDevicePreflightState;
  errorMessage?: string;
  leave: () => Promise<void>;
  retry: () => Promise<CreateMeetingTokenResponse | null>;
  room: Room | null;
  session: LiveKitMeetingSessionState;
  setCameraEnabled: (enabled: boolean) => Promise<void>;
  setMicrophoneEnabled: (enabled: boolean) => Promise<void>;
  start: (
    request: MeetingSessionJoinRequest
  ) => Promise<CreateMeetingTokenResponse | null>;
  status: MeetingSessionControllerStatus;
}

const CHECKING_DEVICE_PREFLIGHT_STATE: MeetingDevicePreflightState = {
  ...INITIAL_MEETING_DEVICE_PREFLIGHT_STATE,
  message: "카메라와 마이크 권한을 확인하고 있습니다.",
  status: "checking"
};

export function useMeetingSessionController(): MeetingSessionController {
  const {
    connect,
    disconnect,
    room,
    session,
    setCameraEnabled,
    setMicrophoneEnabled
  } = useLiveKitMeetingSession();
  const [activeJoinRequest, setActiveJoinRequest] =
    useState<MeetingSessionJoinRequest | null>(null);
  const [devicePreflight, setDevicePreflight] = useState(
    INITIAL_MEETING_DEVICE_PREFLIGHT_STATE
  );
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [status, setStatus] = useState<MeetingSessionControllerStatus>("idle");
  const activeJoinRequestRef = useRef<MeetingSessionJoinRequest | null>(null);
  const attemptIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const statusRef = useRef<MeetingSessionControllerStatus>("idle");
  const tokenAbortControllerRef = useRef<AbortController | null>(null);

  const dispatchStatus = useCallback(
    (event: MeetingSessionControllerEvent) => {
      setStatus((currentStatus) => {
        const nextStatus = getMeetingSessionControllerTransition(
          currentStatus,
          event
        );
        statusRef.current = nextStatus;
        return nextStatus;
      });
    },
    []
  );

  const isCurrentAttempt = useCallback((attemptId: number) => {
    return isMountedRef.current && attemptIdRef.current === attemptId;
  }, []);

  const checkDevices = useCallback(async () => {
    setErrorMessage(undefined);
    setDevicePreflight(CHECKING_DEVICE_PREFLIGHT_STATE);

    const result = await checkMeetingDevicePreflight();

    if (isMountedRef.current) {
      setDevicePreflight(result);
    }

    return result;
  }, []);

  const leave = useCallback(async () => {
    if (statusRef.current === "idle" && !activeJoinRequestRef.current) {
      return;
    }

    attemptIdRef.current += 1;
    tokenAbortControllerRef.current?.abort();
    tokenAbortControllerRef.current = null;
    dispatchStatus("leave");

    try {
      await disconnect();
    } finally {
      if (!isMountedRef.current) {
        return;
      }

      activeJoinRequestRef.current = null;
      setActiveJoinRequest(null);
      setDevicePreflight(INITIAL_MEETING_DEVICE_PREFLIGHT_STATE);
      setErrorMessage(undefined);
      dispatchStatus("left");
    }
  }, [disconnect, dispatchStatus]);

  const start = useCallback(
    async (request: MeetingSessionJoinRequest) => {
      const normalizedRequest = normalizeMeetingSessionJoinRequest(request);
      const currentStatus = statusRef.current;

      if (
        shouldIgnoreMeetingSessionStart(
          activeJoinRequestRef.current,
          normalizedRequest,
          currentStatus
        )
      ) {
        return null;
      }

      attemptIdRef.current += 1;
      const attemptId = attemptIdRef.current;
      tokenAbortControllerRef.current?.abort();
      const tokenAbortController = new AbortController();
      tokenAbortControllerRef.current = tokenAbortController;
      activeJoinRequestRef.current = normalizedRequest;
      setActiveJoinRequest(normalizedRequest);
      setErrorMessage(undefined);
      setDevicePreflight(CHECKING_DEVICE_PREFLIGHT_STATE);
      dispatchStatus(currentStatus === "failed" ? "retry" : "enter");

      try {
        await disconnect();

        const preflightResult = await checkMeetingDevicePreflight();
        if (!isCurrentAttempt(attemptId)) {
          return null;
        }

        setDevicePreflight(preflightResult);
        if (preflightResult.status !== "ready") {
          setErrorMessage(preflightResult.message);
          dispatchStatus("fail");
          return null;
        }

        dispatchStatus("permission-ready");
        const tokenResponse = await createMeetingToken(
          {
            ...normalizedRequest,
            translationPreference: createDefaultMeetingTranslationPreference(
              MEETING_PARTICIPANT_LANGUAGE_BY_COUNTRY[
                normalizedRequest.participantCountry
              ]
            )
          },
          {
            signal: tokenAbortController.signal
          }
        );
        if (!isCurrentAttempt(attemptId)) {
          return null;
        }

        await connect(tokenResponse);
        if (!isCurrentAttempt(attemptId)) {
          await disconnect();
          return null;
        }

        dispatchStatus("connected");
        return tokenResponse;
      } catch (error) {
        if (!isCurrentAttempt(attemptId) || isAbortError(error)) {
          return null;
        }

        setErrorMessage(getErrorMessage(error));
        dispatchStatus("fail");
        return null;
      }
    },
    [connect, disconnect, dispatchStatus, isCurrentAttempt]
  );

  const retry = useCallback(async () => {
    const request = activeJoinRequestRef.current;
    if (!request) {
      return null;
    }

    return start(request);
  }, [start]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    isMountedRef.current = true;

    const handlePageHide = () => {
      attemptIdRef.current += 1;
      tokenAbortControllerRef.current?.abort();
      void disconnect();
    };

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      isMountedRef.current = false;
      attemptIdRef.current += 1;
      tokenAbortControllerRef.current?.abort();
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [disconnect]);

  return {
    activeJoinRequest,
    checkDevices,
    devicePreflight,
    errorMessage,
    leave,
    retry,
    room,
    session,
    setCameraEnabled,
    setMicrophoneEnabled,
    start,
    status
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "회의 연결을 준비하지 못했습니다.";
}
