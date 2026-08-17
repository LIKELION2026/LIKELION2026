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
  type OfficeSummonDecision,
  type OfficeSummonRequestPayload,
  type OfficeSummonRequestedPayload,
  type OfficeSummonRespondPayload,
  type OfficeSummonResolvedPayload,
  type OfficeTodosUpdatedPayload,
  type PresenceMovePayload
} from "@likelion2026/shared";
import { randomUUID } from "node:crypto";
import type { Server, Socket } from "socket.io";

import { PresenceService } from "./presence.service";

const SUMMON_REQUEST_TTL_MS = 30_000;

interface PendingSummonRequest {
  expiresAt: string;
  requestId: string;
  requesterMemberId: string;
  requesterName: string;
  requesterSocketId: string;
  targetMemberId: string;
  targetSocketId: string;
  teamId: string;
  timer: NodeJS.Timeout;
}

@WebSocketGateway({
  cors: {
    origin: true
  },
  namespace: "office"
})
export class PresenceGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  private server!: Server;
  private readonly summonRequests = new Map<string, PendingSummonRequest>();

  constructor(private readonly presenceService: PresenceService) {}

  @SubscribeMessage(SOCKET_EVENT_NAMES.OFFICE_SUMMON_REQUEST)
  handleOfficeSummonRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown
  ): void {
    if (!isOfficeSummonRequestPayload(payload)) {
      return;
    }

    const requester = this.presenceService.getConnection(client.id);
    if (!requester || requester.member.memberId === payload.targetMemberId) {
      return;
    }

    const target = this.presenceService.findConnectedMember(
      payload.targetMemberId,
      requester.teamId
    );
    if (!target) {
      return;
    }

    this.expirePendingRequestForTarget(target.socketId);
    const requestId = randomUUID();
    const expiresAt = new Date(Date.now() + SUMMON_REQUEST_TTL_MS).toISOString();
    const request: OfficeSummonRequestedPayload = {
      expiresAt,
      requestId,
      requesterMemberId: requester.member.memberId,
      requesterName: requester.member.displayName,
      teamId: requester.teamId
    };
    const timer = setTimeout(
      () => this.resolveSummonRequest(requestId, "expired"),
      SUMMON_REQUEST_TTL_MS
    );
    timer.unref();
    const pendingRequest: PendingSummonRequest = {
      ...request,
      requesterSocketId: requester.socketId,
      targetMemberId: target.member.memberId,
      targetSocketId: target.socketId,
      timer
    };
    this.summonRequests.set(requestId, pendingRequest);
    this.server.to(target.socketId).emit(SOCKET_EVENT_NAMES.OFFICE_SUMMON_REQUESTED, request);
  }

  @SubscribeMessage(SOCKET_EVENT_NAMES.OFFICE_SUMMON_RESPOND)
  handleOfficeSummonRespond(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown
  ): void {
    if (!isOfficeSummonRespondPayload(payload)) {
      return;
    }

    const request = this.summonRequests.get(payload.requestId);
    if (!request || request.targetSocketId !== client.id) {
      return;
    }

    if (payload.decision === "declined") {
      this.resolveSummonRequest(request.requestId, "declined");
      return;
    }

    const requester = this.presenceService.getConnection(request.requesterSocketId);
    if (!requester || requester.teamId !== request.teamId) {
      this.resolveSummonRequest(request.requestId, "expired");
      return;
    }

    this.resolveSummonRequest(request.requestId, "accepted", requester.member.avatar);
  }

  publishTodosUpdated(payload: OfficeTodosUpdatedPayload): void {
    this.server
      .to(getTeamRoom(payload.teamId))
      .emit(SOCKET_EVENT_NAMES.OFFICE_TODOS_UPDATED, payload);
  }

  async handleDisconnect(client: Socket): Promise<void> {
    this.expireSummonRequestsForSocket(client.id);
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

  private expirePendingRequestForTarget(targetSocketId: string): void {
    const pendingRequest = [...this.summonRequests.values()].find(
      (request) => request.targetSocketId === targetSocketId
    );
    if (pendingRequest) {
      this.resolveSummonRequest(pendingRequest.requestId, "expired");
    }
  }

  private expireSummonRequestsForSocket(socketId: string): void {
    [...this.summonRequests.values()]
      .filter(
        (request) =>
          request.requesterSocketId === socketId || request.targetSocketId === socketId
      )
      .forEach((request) => this.resolveSummonRequest(request.requestId, "expired"));
  }

  private resolveSummonRequest(
    requestId: string,
    decision: OfficeSummonDecision,
    targetPosition?: OfficeSummonResolvedPayload["targetPosition"]
  ): void {
    const request = this.summonRequests.get(requestId);
    if (!request) {
      return;
    }

    clearTimeout(request.timer);
    this.summonRequests.delete(requestId);
    const payload: OfficeSummonResolvedPayload = {
      decision,
      requestId: request.requestId,
      requesterMemberId: request.requesterMemberId,
      targetMemberId: request.targetMemberId,
      targetPosition: decision === "accepted" ? targetPosition : undefined,
      teamId: request.teamId
    };
    this.server.to(request.requesterSocketId).emit(SOCKET_EVENT_NAMES.OFFICE_SUMMON_RESOLVED, payload);
    this.server.to(request.targetSocketId).emit(SOCKET_EVENT_NAMES.OFFICE_SUMMON_RESOLVED, payload);
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

    const member = this.presenceService.move(client.id, payload);
    const teamId = this.presenceService.getTeamId(client.id);
    if (!member || !teamId) {
      return;
    }

    client.to(getTeamRoom(teamId)).emit(SOCKET_EVENT_NAMES.PRESENCE_MOVED, {
      ...member.avatar,
      memberId: member.memberId,
      occurredAt: new Date().toISOString(),
      sequence: payload.sequence,
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

function isOfficeSummonRequestPayload(value: unknown): value is OfficeSummonRequestPayload {
  return isRecord(value) && isIdentifier(value.targetMemberId);
}

function isOfficeSummonRespondPayload(value: unknown): value is OfficeSummonRespondPayload {
  return (
    isRecord(value) &&
    isIdentifier(value.requestId) &&
    (value.decision === "accepted" || value.decision === "declined")
  );
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
    isNonNegativeSafeInteger(value.sequence) &&
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

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
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
