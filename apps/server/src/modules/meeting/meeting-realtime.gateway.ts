import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
  type WsResponse
} from "@nestjs/websockets";
import {
  LAB_MEETING_ROOM_NAME_PATTERN,
  SOCKET_EVENT_NAMES,
  type MeetingRoomSubscriptionPayload,
  type MeetingRoomSubscriptionRequest,
  type SubtitleCreatedPayload
} from "@likelion2026/shared";
import type { Server, Socket } from "socket.io";

@WebSocketGateway({
  cors: {
    origin: true
  },
  namespace: "/meeting"
})
export class MeetingRealtimeGateway {
  @WebSocketServer()
  private server?: Server;

  @SubscribeMessage(SOCKET_EVENT_NAMES.MEETING_ROOM_SUBSCRIBE)
  handleRoomSubscribe(
    @MessageBody() request: MeetingRoomSubscriptionRequest,
    @ConnectedSocket() client: Socket
  ): WsResponse<MeetingRoomSubscriptionPayload> {
    const roomName = assertLabRoomName(request?.roomName);

    void client.join(toSocketRoomName(roomName));

    return {
      data: createSubscriptionPayload(roomName, client.id),
      event: SOCKET_EVENT_NAMES.MEETING_ROOM_SUBSCRIBED
    };
  }

  @SubscribeMessage(SOCKET_EVENT_NAMES.MEETING_ROOM_UNSUBSCRIBE)
  handleRoomUnsubscribe(
    @MessageBody() request: MeetingRoomSubscriptionRequest,
    @ConnectedSocket() client: Socket
  ): WsResponse<MeetingRoomSubscriptionPayload> {
    const roomName = assertLabRoomName(request?.roomName);

    void client.leave(toSocketRoomName(roomName));

    return {
      data: createSubscriptionPayload(roomName, client.id),
      event: SOCKET_EVENT_NAMES.MEETING_ROOM_UNSUBSCRIBED
    };
  }

  publishSubtitle(payload: SubtitleCreatedPayload): void {
    this.server
      ?.to(toSocketRoomName(payload.roomName))
      .emit(SOCKET_EVENT_NAMES.SUBTITLE_CREATED, payload);
  }
}

function createSubscriptionPayload(
  roomName: string,
  socketId: string
): MeetingRoomSubscriptionPayload {
  return {
    occurredAt: new Date().toISOString(),
    roomName,
    socketId
  };
}

function assertLabRoomName(roomName: string | undefined): string {
  const normalizedRoomName = roomName?.trim() ?? "";

  if (!new RegExp(LAB_MEETING_ROOM_NAME_PATTERN).test(normalizedRoomName)) {
    throw new WsException("roomName must use lab-<team>-<yyyymmdd>-<slug>");
  }

  return normalizedRoomName;
}

function toSocketRoomName(roomName: string): string {
  return `meeting:${roomName}`;
}
