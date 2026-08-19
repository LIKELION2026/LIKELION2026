export type MeetingSessionControllerStatus =
  | "idle"
  | "requesting-permission"
  | "connecting"
  | "connected"
  | "leaving"
  | "failed";

export type MeetingSessionControllerEvent =
  | "enter"
  | "permission-ready"
  | "connected"
  | "fail"
  | "leave"
  | "left"
  | "retry";

export function getMeetingSessionControllerTransition(
  status: MeetingSessionControllerStatus,
  event: MeetingSessionControllerEvent
): MeetingSessionControllerStatus {
  if (event === "leave") {
    return status === "idle" ? "idle" : "leaving";
  }

  if (event === "left") {
    return "idle";
  }

  if (event === "fail") {
    return "failed";
  }

  if (event === "retry") {
    return status === "failed" ? "requesting-permission" : status;
  }

  if (event === "enter") {
    return status === "idle" || status === "failed"
      ? "requesting-permission"
      : status;
  }

  if (event === "permission-ready") {
    return status === "requesting-permission" ? "connecting" : status;
  }

  if (event === "connected") {
    return status === "connecting" ? "connected" : status;
  }

  return status;
}

export function isMeetingSessionStartInFlight(
  status: MeetingSessionControllerStatus
): boolean {
  return status === "requesting-permission" || status === "connecting";
}

export function isMeetingSessionActive(
  status: MeetingSessionControllerStatus
): boolean {
  return isMeetingSessionStartInFlight(status) || status === "connected";
}
