import type {
  AvatarAnimation,
  AvatarDirection,
  MemberStatus,
  OfficeMemberPresence
} from "../../domain/member";

export interface OfficeJoinPayload {
  displayName: string;
  language: OfficeMemberPresence["language"];
  memberId: string;
  teamId: string;
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
  x: number;
  y: number;
}

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
