import type {
  AvatarAnimation,
  AvatarDirection,
  MemberStatus,
  OfficeMemberPresence
} from "../../domain/member";

export interface OfficeJoinPayload {
  displayName: string;
  guestToken: string;
  language: OfficeMemberPresence["language"];
  memberId: string;
  teamId: string;
  workspaceId: string;
}

export interface OfficeSnapshotPayload {
  members: OfficeMemberPresence[];
  occurredAt: string;
  self: OfficeMemberPresence;
  teamId: string;
}

export interface OfficeMemberJoinedPayload {
  member: OfficeMemberPresence;
  occurredAt: string;
  teamId: string;
}

export interface OfficeMemberLeftPayload {
  memberId: string;
  occurredAt: string;
  teamId: string;
}

export interface PresenceMovePayload {
  animation: AvatarAnimation;
  direction: AvatarDirection;
  sequence: number;
  x: number;
  y: number;
}

export type LocalMovementCommand = Omit<PresenceMovePayload, "sequence">;

export interface PresenceMovedPayload extends PresenceMovePayload {
  memberId: string;
  occurredAt: string;
  teamId: string;
}

export interface MemberStatusUpdatePayload {
  status: MemberStatus;
}

export interface PresenceUpdatedPayload {
  teamId: string;
  members: OfficeMemberPresence[];
  occurredAt: string;
}

export interface MemberStatusUpdatedPayload {
  teamId: string;
  member: OfficeMemberPresence;
  previousStatus?: MemberStatus;
  occurredAt: string;
}
