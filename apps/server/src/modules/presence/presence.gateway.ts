import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import {
  SOCKET_EVENT_NAMES,
  isLanguageCode,
  type MemberStatusUpdatePayload,
  type OfficeAttendanceUpdatePayload,
  type OfficeHeartbeatPayload,
  type OfficeJoinPayload,
  type PresenceMovePayload
} from "@likelion2026/shared";
import type { Server, Socket } from "socket.io";

import { PresenceService } from "./presence.service";

@WebSocketGateway({
  cors: {
    origin: true
  },
  namespace: "office"
})
export class PresenceGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  private server!: Server;

  constructor(private readonly presenceService: PresenceService) {}

  async handleDisconnect(client: Socket): Promise<void> {
    const teamId = this.presenceService.getTeamId(client.id);
    const member = await this.presenceService.leave(client.id);
    if (!teamId || !member) {
      return;
    }

    this.server.to(getTeamRoom(teamId)).emit(SOCKET_EVENT_NAMES.OFFICE_LIFECYCLE_UPDATED, {
      memberId: member.memberId,
      occurredAt: new Date().toISOString(),
      presence: member.officePresence,
      teamId
    });
  }

  @SubscribeMessage(SOCKET_EVENT_NAMES.OFFICE_JOIN)
  async handleOfficeJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown
  ): Promise<void> {
    if (!isOfficeJoinPayload(payload)) {
      client.emit("exception", { message: "Invalid office join payload" });
      return;
    }

    const previousTeamId = this.presenceService.getTeamId(client.id);
    if (previousTeamId && previousTeamId !== payload.teamId) {
      await client.leave(getTeamRoom(previousTeamId));
      await this.presenceService.leave(client.id);
    }

    const { members, self } = await this.presenceService.join(client.id, payload);
    const teamRoom = getTeamRoom(payload.teamId);
    await client.join(teamRoom);

    client.emit(SOCKET_EVENT_NAMES.OFFICE_SNAPSHOT, {
      members,
      occurredAt: new Date().toISOString(),
      self,
      teamId: payload.teamId
    });
    client.to(teamRoom).emit(SOCKET_EVENT_NAMES.OFFICE_MEMBER_JOINED, {
      member: self,
      occurredAt: new Date().toISOString(),
      teamId: payload.teamId
    });
  }

  @SubscribeMessage(SOCKET_EVENT_NAMES.PRESENCE_MOVE)
  async handlePresenceMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown
  ): Promise<void> {
    if (!isPresenceMovePayload(payload)) {
      return;
    }

    const member = await this.presenceService.move(client.id, payload);
    const teamId = this.presenceService.getTeamId(client.id);
    if (!member || !teamId) {
      return;
    }

    client.to(getTeamRoom(teamId)).emit(SOCKET_EVENT_NAMES.PRESENCE_MOVED, {
      ...member.avatar,
      memberId: member.memberId,
      occurredAt: new Date().toISOString(),
      teamId
    });
  }

  @SubscribeMessage(SOCKET_EVENT_NAMES.MEMBER_STATUS_UPDATE)
  async handleMemberStatusUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown
  ): Promise<void> {
    if (!isMemberStatusUpdatePayload(payload)) {
      return;
    }

    const update = await this.presenceService.updateStatus(client.id, payload);
    const teamId = this.presenceService.getTeamId(client.id);
    if (!update || !teamId) {
      return;
    }

    this.server.to(getTeamRoom(teamId)).emit(SOCKET_EVENT_NAMES.MEMBER_STATUS_UPDATED, {
      member: update.member,
      occurredAt: new Date().toISOString(),
      previousStatus: update.previousStatus,
      teamId
    });
  }

  @SubscribeMessage(SOCKET_EVENT_NAMES.OFFICE_HEARTBEAT)
  async handleOfficeHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown
  ): Promise<void> {
    if (!isOfficeHeartbeatPayload(payload)) {
      return;
    }

    const member = await this.presenceService.heartbeat(client.id, payload);
    const teamId = this.presenceService.getTeamId(client.id);
    if (!member?.officePresence || !teamId) {
      return;
    }

    client.to(getTeamRoom(teamId)).emit(SOCKET_EVENT_NAMES.OFFICE_LIFECYCLE_UPDATED, {
      memberId: member.memberId,
      occurredAt: new Date().toISOString(),
      presence: member.officePresence,
      teamId
    });
  }

  @SubscribeMessage(SOCKET_EVENT_NAMES.OFFICE_ATTENDANCE_UPDATE)
  async handleOfficeAttendanceUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown
  ): Promise<void> {
    if (!isOfficeAttendanceUpdatePayload(payload)) {
      return;
    }

    const member = await this.presenceService.updateAttendance(client.id, payload);
    const teamId = this.presenceService.getTeamId(client.id);
    if (!member?.officePresence || !teamId) {
      return;
    }

    this.server.to(getTeamRoom(teamId)).emit(SOCKET_EVENT_NAMES.OFFICE_LIFECYCLE_UPDATED, {
      memberId: member.memberId,
      occurredAt: new Date().toISOString(),
      presence: member.officePresence,
      teamId
    });
  }
}

function getTeamRoom(teamId: string): string {
  return `office:${teamId}`;
}

function isOfficeJoinPayload(value: unknown): value is OfficeJoinPayload {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isIdentifier(value.teamId) &&
    isIdentifier(value.memberId) &&
    isIdentifier(value.workspaceId) &&
    value.teamId === value.workspaceId &&
    isGuestToken(value.guestToken) &&
    typeof value.displayName === "string" &&
    value.displayName.trim().length > 0 &&
    typeof value.language === "string" &&
    isLanguageCode(value.language)
  );
}

function isOfficeHeartbeatPayload(value: unknown): value is OfficeHeartbeatPayload {
  if (!isRecord(value)) {
    return false;
  }

  return value.avatar === undefined || isAvatarState(value.avatar);
}

function isOfficeAttendanceUpdatePayload(
  value: unknown
): value is OfficeAttendanceUpdatePayload {
  return (
    isRecord(value) &&
    (value.attendanceStatus === "working" || value.attendanceStatus === "checked_out")
  );
}

function isPresenceMovePayload(value: unknown): value is PresenceMovePayload {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    (value.direction === "up" ||
      value.direction === "down" ||
      value.direction === "left" ||
      value.direction === "right") &&
    (value.animation === "idle" || value.animation === "walk")
  );
}

function isMemberStatusUpdatePayload(
  value: unknown
): value is MemberStatusUpdatePayload {
  return isRecord(value) && PresenceService.isMemberStatus(value.status);
}

function isIdentifier(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{3,64}$/.test(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isGuestToken(value: unknown): value is string {
  return typeof value === "string" && /^guest_[a-zA-Z0-9]{16,64}$/.test(value);
}

function isAvatarState(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    (value.direction === "up" ||
      value.direction === "down" ||
      value.direction === "left" ||
      value.direction === "right") &&
    (value.animation === "idle" || value.animation === "walk")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
