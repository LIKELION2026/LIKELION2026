import { useEffect, useRef, useState } from "react";
import type {
  GuestOfficeSessionResponse,
  MemberStatus
} from "@likelion2026/shared";
import type { LiveKitMeetingSessionStatus } from "../../realtime-meeting/model/use-livekit-meeting-session";

import { createOrRestoreOfficeSession } from "../api/create-office-session";
import { getStoredGuestProfile } from "../../../shared/lib/development-identity";
import { useOfficeStore } from "./office-store";
import { getMeetingPresenceAction } from "./meeting-presence-transition";
import { useOfficeSocket } from "./use-office-socket";

export function useMeetingOfficePresence(
  meetingSessionStatus: LiveKitMeetingSessionStatus
): void {
  const [officeSession, setOfficeSession] =
    useState<GuestOfficeSessionResponse | null>(null);
  const previousStatusRef = useRef<MemberStatus>("available");
  const isMeetingStatusAppliedRef = useRef(false);
  const connectionState = useOfficeStore((state) => state.connectionState);
  const self = useOfficeStore((state) => state.self);
  const { updateStatus } = useOfficeSocket(officeSession);

  useEffect(() => {
    if (meetingSessionStatus !== "connected" && meetingSessionStatus !== "reconnecting") {
      return;
    }

    const profile = getStoredGuestProfile();
    if (!profile || officeSession) {
      return;
    }

    void createOrRestoreOfficeSession(profile).then(setOfficeSession).catch(() => {
      // 회의 연결 자체는 유지하고, 오피스 상태 표시는 다음 재접속에서 복구한다.
    });
  }, [meetingSessionStatus, officeSession]);

  useEffect(() => {
    if (connectionState !== "connected") {
      return;
    }

    const action = getMeetingPresenceAction({
      isApplied: isMeetingStatusAppliedRef.current,
      sessionStatus: meetingSessionStatus
    });

    if (action === "apply") {
      previousStatusRef.current = self?.status ?? "available";
      updateStatus("in_meeting");
      isMeetingStatusAppliedRef.current = true;
      return;
    }

    if (action === "restore") {
      updateStatus(previousStatusRef.current);
      isMeetingStatusAppliedRef.current = false;
    }
  }, [connectionState, meetingSessionStatus, self?.status, updateStatus]);

  useEffect(() => {
    return () => {
      if (isMeetingStatusAppliedRef.current) {
        updateStatus(previousStatusRef.current);
      }
    };
  }, [updateStatus]);
}
