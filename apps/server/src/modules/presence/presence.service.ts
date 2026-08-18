import { Injectable } from "@nestjs/common";
import type {
  MemberStatus,
  MemberStatusUpdatePayload,
  OfficeAttendanceUpdatePayload,
  OfficeHeartbeatPayload,
  OfficeJoinPayload,
  OfficeMemberPresence,
  PresenceMovePayload
} from "@likelion2026/shared";

import { OfficeService } from "../office/office.service";

const POSITION_PERSIST_INTERVAL_MS = 1_000;

interface ConnectionRecord {
  guestToken: string;
  lastPersistStartedAt: number;
  member: OfficeMemberPresence;
  persistencePromise?: Promise<void>;
  persistenceScheduled: boolean;
  persistenceTimer?: NodeJS.Timeout;
  teamId: string;
  workspaceId: string;
}

export interface ConnectedOfficeMember {
  member: OfficeMemberPresence;
  socketId: string;
  teamId: string;
}

@Injectable()
export class PresenceService {
  private readonly connections = new Map<string, ConnectionRecord>();

  constructor(private readonly officeService: OfficeService) {}

  async join(
    socketId: string,
    payload: OfficeJoinPayload
  ): Promise<{ members: OfficeMemberPresence[]; self: OfficeMemberPresence }> {
    const self = await this.officeService.connectRealtimeMember(
      payload.memberId,
      payload.guestToken
    );
    this.connections.set(socketId, {
      guestToken: payload.guestToken,
      lastPersistStartedAt: Date.now(),
      member: self,
      persistenceScheduled: false,
      teamId: payload.teamId,
      workspaceId: payload.workspaceId
    });

    return {
      members: await this.officeService.getWorkspaceRealtimeMembers(payload.workspaceId),
      self
    };
  }

  async leave(socketId: string): Promise<OfficeMemberPresence | null> {
    const connection = this.connections.get(socketId);
    if (!connection) {
      return null;
    }

    this.connections.delete(socketId);
    if (connection.persistenceTimer) {
      clearTimeout(connection.persistenceTimer);
    }
    await connection.persistencePromise;
    return this.officeService.disconnectRealtimeMember(
      connection.member.memberId,
      connection.guestToken,
      connection.member.avatar
    );
  }

  move(
    socketId: string,
    payload: PresenceMovePayload
  ): OfficeMemberPresence | null {
    const connection = this.connections.get(socketId);
    if (!connection) {
      return null;
    }

    const member = withAvatar(connection.member, payload);
    connection.member = member;
    connection.persistenceScheduled = true;
    this.schedulePositionPersistence(socketId, Date.now());

    return connection.member;
  }

  async heartbeat(
    socketId: string,
    payload: OfficeHeartbeatPayload
  ): Promise<OfficeMemberPresence | null> {
    const connection = this.connections.get(socketId);
    if (!connection) {
      return null;
    }

    const member = payload.avatar
      ? withAvatar(connection.member, payload.avatar)
      : connection.member;
    const persistedMember = await this.officeService.heartbeatRealtimeMember(
      member.memberId,
      connection.guestToken,
      member.avatar
    );
    connection.member = withAvatar(persistedMember, member.avatar);
    connection.lastPersistStartedAt = Date.now();
    return connection.member;
  }

  async updateStatus(
    socketId: string,
    payload: MemberStatusUpdatePayload
  ): Promise<{ member: OfficeMemberPresence; previousStatus: MemberStatus } | null> {
    const connection = this.connections.get(socketId);
    if (!connection) {
      return null;
    }

    const previousStatus = connection.member.status;
    const persistedMember = await this.officeService.updateRealtimeMemberStatus(
      connection.member.memberId,
      connection.guestToken,
      payload.status
    );
    connection.member = withAvatar(persistedMember, connection.member.avatar);
    return { member: connection.member, previousStatus };
  }

  async updateAttendance(
    socketId: string,
    payload: OfficeAttendanceUpdatePayload
  ): Promise<OfficeMemberPresence | null> {
    const connection = this.connections.get(socketId);
    if (!connection) {
      return null;
    }

    const persistedMember = await this.officeService.updateRealtimeMemberAttendance(
      connection.member.memberId,
      connection.guestToken,
      payload.attendanceStatus
    );
    connection.member = withAvatar(persistedMember, connection.member.avatar);
    return connection.member;
  }

  getTeamId(socketId: string): string | null {
    return this.connections.get(socketId)?.teamId ?? null;
  }

  getConnection(socketId: string): ConnectedOfficeMember | null {
    const connection = this.connections.get(socketId);
    return connection
      ? { member: connection.member, socketId, teamId: connection.teamId }
      : null;
  }

  findConnectedMember(memberId: string, teamId: string): ConnectedOfficeMember | null {
    for (const [socketId, connection] of this.connections) {
      if (connection.member.memberId === memberId && connection.teamId === teamId) {
        return { member: connection.member, socketId, teamId: connection.teamId };
      }
    }

    return null;
  }

  private schedulePositionPersistence(socketId: string, now: number): void {
    const connection = this.connections.get(socketId);
    if (!connection || connection.persistencePromise || connection.persistenceTimer) {
      return;
    }

    const delay = Math.max(
      0,
      POSITION_PERSIST_INTERVAL_MS - (now - connection.lastPersistStartedAt)
    );
    connection.persistenceTimer = setTimeout(() => {
      const activeConnection = this.connections.get(socketId);
      if (activeConnection) {
        activeConnection.persistenceTimer = undefined;
      }
      this.persistLatestPosition(socketId);
    }, delay);
  }

  private persistLatestPosition(socketId: string): void {
    const connection = this.connections.get(socketId);
    if (!connection || !connection.persistenceScheduled || connection.persistencePromise) {
      return;
    }

    connection.persistenceScheduled = false;
    connection.lastPersistStartedAt = Date.now();
    const member = connection.member;
    connection.persistencePromise = this.officeService
      .updateRealtimeMemberPosition(member.memberId, connection.guestToken, member.avatar)
      .then(() => undefined)
      .catch(() => undefined)
      .finally(() => {
        const activeConnection = this.connections.get(socketId);
        if (!activeConnection) {
          return;
        }

        activeConnection.persistencePromise = undefined;
        if (activeConnection.persistenceScheduled) {
          this.schedulePositionPersistence(socketId, Date.now());
        }
      });
  }

  static isMemberStatus(value: unknown): value is MemberStatus {
    return (
      typeof value === "string" &&
      ["available", "focused", "in_meeting", "away"].includes(value)
    );
  }
}

function withAvatar(
  member: OfficeMemberPresence,
  avatar: PresenceMovePayload | OfficeMemberPresence["avatar"]
): OfficeMemberPresence {
  const updatedAt = new Date().toISOString();
  return {
    ...member,
    avatar: {
      animation: avatar.animation,
      direction: avatar.direction,
      x: avatar.x,
      y: avatar.y
    },
    officePresence: member.officePresence
      ? {
          ...member.officePresence,
          avatar: {
            animation: avatar.animation,
            direction: avatar.direction,
            x: avatar.x,
            y: avatar.y
          },
          updatedAt
        }
      : undefined,
    updatedAt
  };
}
