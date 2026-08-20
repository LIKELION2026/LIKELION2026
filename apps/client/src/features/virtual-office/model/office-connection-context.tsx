import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { JSX, PropsWithChildren } from "react";
import { useTranslation } from "react-i18next";
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
import {
  createOrRestoreOfficeSession,
  getOfficeSessionErrorReason,
  type OfficeSessionErrorReason
} from "../api/create-office-session";
import { useOfficeSocket, type OfficeSocketCallbacks } from "./use-office-socket";

interface OfficeConnectionContextValue {
  isPreparingSession: boolean;
  isRestoringStoredSession: boolean;
  prepareSession: (profile: GuestProfile) => Promise<void>;
  registerSocketCallbacks: (callbacks: OfficeSocketCallbacks) => () => void;
  respondToSummon: (requestId: string, decision: "accepted" | "declined") => void;
  sendChatMessage: (text: string) => boolean;
  sendMove: (payload: LocalMovementCommand) => void;
  sendSummonRequest: (targetMemberId: string) => boolean;
  session: GuestOfficeSessionResponse | null;
  sessionError: string | null;
  updateAttendance: (attendanceStatus: AttendanceStatus) => void;
  updateStatus: (status: MemberStatus) => void;
}

const OfficeConnectionContext = createContext<OfficeConnectionContextValue | null>(null);

export function OfficeConnectionProvider({ children }: PropsWithChildren): JSX.Element {
  const { t } = useTranslation();
  const { showError } = useRequestFeedback();
  const [session, setSession] = useState<GuestOfficeSessionResponse | null>(null);
  const [isPreparingSession, setIsPreparingSession] = useState(false);
  const [isRestoringStoredSession, setIsRestoringStoredSession] = useState(
    () => getStoredGuestProfile() !== null
  );
  const [sessionErrorReason, setSessionErrorReason] =
    useState<OfficeSessionErrorReason | null>(null);
  const callbacksRef = useRef<OfficeSocketCallbacks>({});
  const didRestoreStoredProfile = useRef(false);
  const socketCallbacks = useMemo<OfficeSocketCallbacks>(
    () => ({
      onCalendarUpdated: () => callbacksRef.current.onCalendarUpdated?.(),
      onChatMessage: (payload) => callbacksRef.current.onChatMessage?.(payload),
      onMeetingSummaryReady: (payload) =>
        callbacksRef.current.onMeetingSummaryReady?.(payload),
      onSummonRequested: (payload) => callbacksRef.current.onSummonRequested?.(payload),
      onSummonResolved: (payload) => callbacksRef.current.onSummonResolved?.(payload),
      onTodosUpdated: () => callbacksRef.current.onTodosUpdated?.()
    }),
    []
  );
  const {
    respondToSummon,
    sendChatMessage,
    sendMove,
    sendSummonRequest,
    updateAttendance,
    updateStatus
  } = useOfficeSocket(session, socketCallbacks);

  const prepareSession = useCallback(async (profile: GuestProfile) => {
    setIsPreparingSession(true);
    setSessionErrorReason(null);
    try {
      const nextSession = await createOrRestoreOfficeSession(profile);
      saveGuestProfile(profile);
      setSession(nextSession);
    } catch (error) {
      setSession(null);
      const reason = getOfficeSessionErrorReason(error);
      const message = t(`officeSession.errors.${reason}`);
      setSessionErrorReason(reason);
      showError(new Error(message), t("officeSession.errors.prepareFailedRetry"));
    } finally {
      setIsPreparingSession(false);
    }
  }, [showError, t]);

  useEffect(() => {
    if (didRestoreStoredProfile.current) {
      return;
    }

    const storedProfile = getStoredGuestProfile();
    if (!storedProfile) {
      setIsRestoringStoredSession(false);
      return;
    }

    didRestoreStoredProfile.current = true;
    void prepareSession(storedProfile).finally(() => setIsRestoringStoredSession(false));
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
      isRestoringStoredSession,
      prepareSession,
      registerSocketCallbacks,
      respondToSummon,
      sendChatMessage,
      sendMove,
      sendSummonRequest,
      session,
      sessionError: sessionErrorReason
        ? t(`officeSession.errors.${sessionErrorReason}`)
        : null,
      updateAttendance,
      updateStatus
    }),
    [
      isPreparingSession,
      isRestoringStoredSession,
      prepareSession,
      registerSocketCallbacks,
      respondToSummon,
      sendChatMessage,
      sendMove,
      sendSummonRequest,
      session,
      sessionErrorReason,
      t,
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
