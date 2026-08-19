import type { MeetingParticipantCountry } from "@likelion2026/shared";

import type { MeetingSessionControllerStatus } from "./meeting-session-transition";

export interface MeetingSessionJoinRequest {
  participantCountry: MeetingParticipantCountry;
  participantIdentity?: string;
  participantName: string;
  roomName: string;
}

export function normalizeMeetingSessionJoinRequest(
  request: MeetingSessionJoinRequest
): MeetingSessionJoinRequest {
  const participantIdentity = request.participantIdentity?.trim();

  return {
    participantCountry: request.participantCountry,
    ...(participantIdentity ? { participantIdentity } : {}),
    participantName: request.participantName.trim(),
    roomName: request.roomName.trim()
  };
}

export function isSameMeetingSessionJoinRequest(
  left: MeetingSessionJoinRequest,
  right: MeetingSessionJoinRequest
): boolean {
  return (
    left.participantCountry === right.participantCountry &&
    left.participantIdentity === right.participantIdentity &&
    left.participantName === right.participantName &&
    left.roomName === right.roomName
  );
}

export function shouldIgnoreMeetingSessionStart(
  currentRequest: MeetingSessionJoinRequest | null,
  nextRequest: MeetingSessionJoinRequest,
  currentStatus: MeetingSessionControllerStatus
): boolean {
  return Boolean(
    currentRequest &&
      isSameMeetingSessionJoinRequest(currentRequest, nextRequest) &&
      currentStatus !== "failed"
  );
}
