import { useCallback, useEffect, useRef } from "react";
import {
  SOCKET_EVENT_NAMES,
  type MemberStatus,
  type MemberStatusUpdatedPayload,
  type OfficeMemberJoinedPayload,
  type OfficeMemberLeftPayload,
  type OfficeSnapshotPayload,
  type PresenceMovePayload,
  type PresenceMovedPayload
} from "@likelion2026/shared";
import { io, type Socket } from "socket.io-client";

import { SERVER_URL } from "../../../shared/config/environment";
import type { DevelopmentIdentity } from "../../../shared/lib/development-identity";
import { useOfficeStore } from "./office-store";

const MOVEMENT_INTERVAL_MS = 80;

export function useOfficeSocket(identity: DevelopmentIdentity): {
  sendMove: (payload: PresenceMovePayload) => void;
  updateStatus: (status: MemberStatus) => void;
} {
  const socketRef = useRef<Socket | null>(null);
  const lastMoveRef = useRef<PresenceMovePayload & { sentAt: number } | null>(null);
  const setConnectionState = useOfficeStore((state) => state.setConnectionState);
  const setSnapshot = useOfficeStore((state) => state.setSnapshot);
  const upsertMember = useOfficeStore((state) => state.upsertMember);
  const removeMember = useOfficeStore((state) => state.removeMember);
  const updateMemberPosition = useOfficeStore((state) => state.updateMemberPosition);
  const updateMemberStatus = useOfficeStore((state) => state.updateMemberStatus);

  useEffect(() => {
    const socket = io(`${SERVER_URL}/office`, {
      reconnection: true,
      transports: ["websocket"]
    });
    socketRef.current = socket;

    const handleConnect = () => {
      setConnectionState("connected");
      socket.emit(SOCKET_EVENT_NAMES.OFFICE_JOIN, identity);
    };
    const handleDisconnect = () => setConnectionState("disconnected");
    const handleReconnectAttempt = () => setConnectionState("reconnecting");
    const handleSnapshot = (payload: OfficeSnapshotPayload) =>
      setSnapshot(payload.self, payload.members);
    const handleMemberJoined = (payload: OfficeMemberJoinedPayload) =>
      upsertMember(payload.member);
    const handleMemberLeft = (payload: OfficeMemberLeftPayload) =>
      removeMember(payload.memberId);
    const handleMemberMoved = (payload: PresenceMovedPayload) =>
      updateMemberPosition(payload);
    const handleStatusUpdated = (payload: MemberStatusUpdatedPayload) =>
      updateMemberStatus(payload.member);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.io.on("reconnect_attempt", handleReconnectAttempt);
    socket.on(SOCKET_EVENT_NAMES.OFFICE_SNAPSHOT, handleSnapshot);
    socket.on(SOCKET_EVENT_NAMES.OFFICE_MEMBER_JOINED, handleMemberJoined);
    socket.on(SOCKET_EVENT_NAMES.OFFICE_MEMBER_LEFT, handleMemberLeft);
    socket.on(SOCKET_EVENT_NAMES.PRESENCE_MOVED, handleMemberMoved);
    socket.on(SOCKET_EVENT_NAMES.MEMBER_STATUS_UPDATED, handleStatusUpdated);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.io.off("reconnect_attempt", handleReconnectAttempt);
      socket.off(SOCKET_EVENT_NAMES.OFFICE_SNAPSHOT, handleSnapshot);
      socket.off(SOCKET_EVENT_NAMES.OFFICE_MEMBER_JOINED, handleMemberJoined);
      socket.off(SOCKET_EVENT_NAMES.OFFICE_MEMBER_LEFT, handleMemberLeft);
      socket.off(SOCKET_EVENT_NAMES.PRESENCE_MOVED, handleMemberMoved);
      socket.off(SOCKET_EVENT_NAMES.MEMBER_STATUS_UPDATED, handleStatusUpdated);
      socket.disconnect();
      socketRef.current = null;
      setConnectionState("disconnected");
    };
  }, [
    identity,
    removeMember,
    setConnectionState,
    setSnapshot,
    updateMemberPosition,
    updateMemberStatus,
    upsertMember
  ]);

  const sendMove = useCallback((payload: PresenceMovePayload) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      return;
    }

    const now = Date.now();
    const previous = lastMoveRef.current;
    const didNotChange =
      previous?.x === payload.x &&
      previous.y === payload.y &&
      previous.direction === payload.direction &&
      previous.animation === payload.animation;

    if (didNotChange || (previous && now - previous.sentAt < MOVEMENT_INTERVAL_MS)) {
      return;
    }

    socket.emit(SOCKET_EVENT_NAMES.PRESENCE_MOVE, payload);
    lastMoveRef.current = { ...payload, sentAt: now };
  }, []);

  const updateStatus = useCallback((status: MemberStatus) => {
    socketRef.current?.emit(SOCKET_EVENT_NAMES.MEMBER_STATUS_UPDATE, { status });
  }, []);

  return { sendMove, updateStatus };
}
