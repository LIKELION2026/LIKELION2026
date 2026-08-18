import type { OfficeMemberPresence } from "../../domain/member";

export type OfficeSummonDecision = "accepted" | "declined" | "expired";

export interface OfficeSummonRequestPayload {
  targetMemberId: string;
}

export interface OfficeSummonRequestedPayload {
  expiresAt: string;
  requestId: string;
  requesterMemberId: string;
  requesterName: string;
  teamId: string;
}

export interface OfficeSummonRespondPayload {
  decision: "accepted" | "declined";
  requestId: string;
}

export interface OfficeSummonResolvedPayload {
  decision: OfficeSummonDecision;
  requestId: string;
  requesterMemberId: string;
  targetMemberId: string;
  targetPosition?: OfficeMemberPresence["avatar"];
  teamId: string;
}
