import { useEffect, useRef } from "react";
import type { MemberStatus } from "@likelion2026/shared";
import type { LiveKitMeetingSessionStatus } from "../../realtime-meeting/model/use-livekit-meeting-session";

import { useOfficeConnection } from "./office-connection-context";
import { useOfficeStore } from "./office-store";
import { getMeetingPresenceAction } from "./meeting-presence-transition";

export function useMeetingOfficePresence(
  meetingSessionStatus: LiveKitMeetingSessionStatus
): void {
  const previousStatusRef = useRef<MemberStatus>("available");
  const isMeetingStatusAppliedRef = useRef(false);
  const connectionState = useOfficeStore((state) => state.connectionState);
  const self = useOfficeStore((state) => state.self);
  const { updateStatus } = useOfficeConnection();

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
