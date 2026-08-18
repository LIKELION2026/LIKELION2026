import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { JSX, PropsWithChildren } from "react";
import type {
  AttendanceStatus,
  GuestOfficeSessionResponse,
  LocalMovementCommand,
  MemberStatus,
  OfficeSummonRequestedPayload,
  OfficeSummonResolvedPayload
} from "@likelion2026/shared";

import { useRequestFeedback } from "../../../app/request-feedback";
import {
  getStoredGuestProfile,
  saveGuestProfile,
  type GuestProfile
} from "../../../shared/lib/development-identity";
import { createOrRestoreOfficeSession } from "../api/create-office-session";
import { useOfficeSocket, type OfficeSocketCallbacks } from "./use-office-socket";

interface OfficeConnectionContextValue {
  isPreparingSession: boolean;
  prepareSession: (profile: GuestProfile) => Promise<void>;
  registerSocketCallbacks: (callbacks: OfficeSocketCallbacks) => () => void;
  respondToSummon: (requestId: string, decision: "accepted" | "declined") => void;
  sendMove: (payload: LocalMovementCommand) => void;
  sendSummonRequest: (targetMemberId: string) => boolean;
  session: GuestOfficeSessionResponse | null;
  sessionError: string | null;
  updateAttendance: (attendanceStatus: AttendanceStatus) => void;
  updateStatus: (status: MemberStatus) => void;
}

const OfficeConnectionContext = createContext<OfficeConnectionContextValue | null>(null);

export function OfficeConnectionProvider({ children }: PropsWithChildren): JSX.Element {
  const { showError } = useRequestFeedback();
  const [session, setSession] = useState<GuestOfficeSessionResponse | null>(null);
  const [isPreparingSession, setIsPreparingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const callbacksRef = useRef<OfficeSocketCallbacks>({});
  const didRestoreStoredProfile = useRef(false);
  const socketCallbacks = useMemo<OfficeSocketCallbacks>(
    () => ({
      onCalendarUpdated: () => callbacksRef.current.onCalendarUpdated?.(),
      onSummonRequested: (payload) => callbacksRef.current.onSummonRequested?.(payload),
      onSummonResolved: (payload) => callbacksRef.current.onSummonResolved?.(payload),
      onTodosUpdated: () => callbacksRef.current.onTodosUpdated?.()
    }),
    []
  );
  const {
    respondToSummon,
    sendMove,
    sendSummonRequest,
    updateAttendance,
    updateStatus
  } = useOfficeSocket(session, socketCallbacks);

  const prepareSession = useCallback(async (profile: GuestProfile) => {
    setIsPreparingSession(true);
    setSessionError(null);
    try {
      const nextSession = await createOrRestoreOfficeSession(profile);
      saveGuestProfile(profile);
      setSession(nextSession);
    } catch (error) {
      setSession(null);
      const message = error instanceof Error ? error.message : "오피스 세션을 준비하지 못했습니다.";
      setSessionError(message);
      showError(error, "오피스 세션을 준비하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setIsPreparingSession(false);
    }
  }, [showError]);

  useEffect(() => {
    if (didRestoreStoredProfile.current) {
      return;
    }

    const storedProfile = getStoredGuestProfile();
    if (!storedProfile) {
      return;
    }

    didRestoreStoredProfile.current = true;
    void prepareSession(storedProfile);
  }, [prepareSession]);

  const registerSocketCallbacks = useCallback((callbacks: OfficeSocketCallbacks) => {
    callbacksRef.current = callbacks;
    return () => {
      if (callbacksRef.current === callbacks) {
        callbacksRef.current = {};
      }
    };
  }, []);

  const value = useMemo<OfficeConnectionContextValue>(
    () => ({
      isPreparingSession,
      prepareSession,
      registerSocketCallbacks,
      respondToSummon,
      sendMove,
      sendSummonRequest,
      session,
      sessionError,
      updateAttendance,
      updateStatus
    }),
    [
      isPreparingSession,
      prepareSession,
      registerSocketCallbacks,
      respondToSummon,
      sendMove,
      sendSummonRequest,
      session,
      sessionError,
      updateAttendance,
      updateStatus
    ]
  );

  return <OfficeConnectionContext.Provider value={value}>{children}</OfficeConnectionContext.Provider>;
}

export function useOfficeConnection(): OfficeConnectionContextValue {
  const value = useContext(OfficeConnectionContext);
  if (!value) {
    throw new Error("useOfficeConnection must be used within OfficeConnectionProvider");
  }
  return value;
}
