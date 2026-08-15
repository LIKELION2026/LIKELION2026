import type { MemberPresence, MemberStatus } from "../../domain/member";

export interface PresenceUpdatedPayload {
  teamId: string;
  members: MemberPresence[];
  occurredAt: string;
}

export interface MemberStatusUpdatedPayload {
  teamId: string;
  member: MemberPresence;
  previousStatus?: MemberStatus;
  occurredAt: string;
}
