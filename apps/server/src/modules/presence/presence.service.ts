import { Injectable } from "@nestjs/common";
import {
  MEMBER_STATUS_VALUES,
  type MemberStatus,
  type MemberStatusUpdatePayload,
  type OfficeJoinPayload,
  type OfficeMemberPresence,
  type PresenceMovePayload
} from "@likelion2026/shared";

const OFFICE_BOUNDS = {
  maxX: 1152,
  maxY: 720,
  minX: 48,
  minY: 48
} as const;

interface ConnectionRecord {
  memberId: string;
  teamId: string;
}

@Injectable()
export class PresenceService {
  private readonly connections = new Map<string, ConnectionRecord>();
  private readonly membersByTeam = new Map<
    string,
    Map<string, OfficeMemberPresence>
  >();

  join(socketId: string, payload: OfficeJoinPayload): OfficeMemberPresence {
    const teamMembers = this.getTeamMembers(payload.teamId);
    const existingMember = teamMembers.get(payload.memberId);
    const member = existingMember ?? this.createMember(payload, teamMembers.size);

    teamMembers.set(payload.memberId, {
      ...member,
      displayName: payload.displayName,
      language: payload.language,
      updatedAt: new Date().toISOString()
    });
    this.connections.set(socketId, {
      memberId: payload.memberId,
      teamId: payload.teamId
    });

    return this.getMember(socketId)!;
  }

  leave(socketId: string): OfficeMemberPresence | null {
    const connection = this.connections.get(socketId);
    if (!connection) {
      return null;
    }

    this.connections.delete(socketId);
    const teamMembers = this.membersByTeam.get(connection.teamId);
    const member = teamMembers?.get(connection.memberId) ?? null;
    teamMembers?.delete(connection.memberId);

    if (teamMembers?.size === 0) {
      this.membersByTeam.delete(connection.teamId);
    }

    return member;
  }

  move(socketId: string, payload: PresenceMovePayload): OfficeMemberPresence | null {
    const member = this.getMember(socketId);
    if (!member) {
      return null;
    }

    const nextMember: OfficeMemberPresence = {
      ...member,
      avatar: {
        animation: payload.animation,
        direction: payload.direction,
        x: clamp(payload.x, OFFICE_BOUNDS.minX, OFFICE_BOUNDS.maxX),
        y: clamp(payload.y, OFFICE_BOUNDS.minY, OFFICE_BOUNDS.maxY)
      },
      updatedAt: new Date().toISOString()
    };

    this.saveMember(socketId, nextMember);
    return nextMember;
  }

  updateStatus(
    socketId: string,
    payload: MemberStatusUpdatePayload
  ): { member: OfficeMemberPresence; previousStatus: MemberStatus } | null {
    const member = this.getMember(socketId);
    if (!member) {
      return null;
    }

    const nextMember: OfficeMemberPresence = {
      ...member,
      status: payload.status,
      updatedAt: new Date().toISOString()
    };
    this.saveMember(socketId, nextMember);

    return {
      member: nextMember,
      previousStatus: member.status
    };
  }

  getMembers(teamId: string): OfficeMemberPresence[] {
    return [...this.getTeamMembers(teamId).values()];
  }

  getMember(socketId: string): OfficeMemberPresence | null {
    const connection = this.connections.get(socketId);
    if (!connection) {
      return null;
    }

    return this.membersByTeam.get(connection.teamId)?.get(connection.memberId) ?? null;
  }

  getTeamId(socketId: string): string | null {
    return this.connections.get(socketId)?.teamId ?? null;
  }

  static isMemberStatus(value: unknown): value is MemberStatus {
    return typeof value === "string" && (MEMBER_STATUS_VALUES as readonly string[]).includes(value);
  }

  private createMember(
    payload: OfficeJoinPayload,
    memberIndex: number
  ): OfficeMemberPresence {
    const column = memberIndex % 4;
    const row = Math.floor(memberIndex / 4);

    return {
      avatar: {
        animation: "idle",
        direction: "down",
        x: 160 + column * 72,
        y: 264 + row * 72
      },
      displayName: payload.displayName,
      language: payload.language,
      memberId: payload.memberId,
      status: "available",
      updatedAt: new Date().toISOString()
    };
  }

  private getTeamMembers(teamId: string): Map<string, OfficeMemberPresence> {
    const existing = this.membersByTeam.get(teamId);
    if (existing) {
      return existing;
    }

    const members = new Map<string, OfficeMemberPresence>();
    this.membersByTeam.set(teamId, members);
    return members;
  }

  private saveMember(socketId: string, member: OfficeMemberPresence): void {
    const connection = this.connections.get(socketId);
    if (!connection) {
      return;
    }

    this.getTeamMembers(connection.teamId).set(member.memberId, member);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
