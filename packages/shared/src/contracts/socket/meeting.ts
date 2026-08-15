import type { MeetingParticipant } from "../../domain/meeting";

export interface MeetingRequestedPayload {
  teamId: string;
  roomName: string;
  requestedBy: MeetingParticipant;
  targetMemberIds: string[];
  occurredAt: string;
}

export interface MeetingJoinedPayload {
  teamId: string;
  roomName: string;
  participant: MeetingParticipant;
  occurredAt: string;
}
