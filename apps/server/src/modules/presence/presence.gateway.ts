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
    const member = this.presenceService.leave(client.id);
    if (!teamId || !member) {
      return;
    }

    this.server.to(getTeamRoom(teamId)).emit(SOCKET_EVENT_NAMES.OFFICE_MEMBER_LEFT, {
      memberId: member.memberId,
      occurredAt: new Date().toISOString(),
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
      this.presenceService.leave(client.id);
    }

    const member = this.presenceService.join(client.id, payload);
    const teamRoom = getTeamRoom(payload.teamId);
    await client.join(teamRoom);

    client.emit(SOCKET_EVENT_NAMES.OFFICE_SNAPSHOT, {
      members: this.presenceService.getMembers(payload.teamId),
      occurredAt: new Date().toISOString(),
      self: member,
      teamId: payload.teamId
    });
    client.to(teamRoom).emit(SOCKET_EVENT_NAMES.OFFICE_MEMBER_JOINED, {
      member,
      occurredAt: new Date().toISOString(),
      teamId: payload.teamId
    });
  }

  @SubscribeMessage(SOCKET_EVENT_NAMES.PRESENCE_MOVE)
  handlePresenceMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown
  ): void {
    if (!isPresenceMovePayload(payload)) {
      return;
    }

    const member = this.presenceService.move(client.id, payload);
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
  handleMemberStatusUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown
  ): void {
    if (!isMemberStatusUpdatePayload(payload)) {
      return;
    }

    const update = this.presenceService.updateStatus(client.id, payload);
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
    typeof value.displayName === "string" &&
    value.displayName.trim().length > 0 &&
    typeof value.language === "string" &&
    isLanguageCode(value.language)
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
