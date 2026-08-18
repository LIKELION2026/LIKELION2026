import type { LiveKitMeetingSessionStatus } from "../../realtime-meeting/model/use-livekit-meeting-session";

export type MeetingPresenceAction = "apply" | "none" | "restore";

interface GetMeetingPresenceActionOptions {
  isApplied: boolean;
  sessionStatus: LiveKitMeetingSessionStatus;
}

export function getMeetingPresenceAction({
  isApplied,
  sessionStatus
}: GetMeetingPresenceActionOptions): MeetingPresenceAction {
  const isMeetingConnected =
    sessionStatus === "connected" || sessionStatus === "reconnecting";

  if (!isApplied && isMeetingConnected) {
    return "apply";
  }

  if (
    isApplied &&
    (sessionStatus === "disconnected" ||
      sessionStatus === "failed" ||
      sessionStatus === "idle")
  ) {
    return "restore";
  }

  return "none";
}
