import { useCallback, useEffect, useRef } from "react";
import {
  SOCKET_EVENT_NAMES,
  type MemberStatus,
  type MemberStatusUpdatedPayload,
  type OfficeMemberJoinedPayload,
  type OfficeMemberLeftPayload,
  type OfficeLifecycleUpdatedPayload,
  type AttendanceStatus,
  type OfficeSnapshotPayload,
  type PresenceMovePayload,
  type PresenceMovedPayload
} from "@likelion2026/shared";
import { io, type Socket } from "socket.io-client";

import { SERVER_URL } from "../../../shared/config/environment";
import type { DevelopmentIdentity } from "../../../shared/lib/development-identity";
import { createOrRestoreOfficeSession } from "../api/create-office-session";
import { useOfficeStore } from "./office-store";

const MOVEMENT_INTERVAL_MS = 80;
const HEARTBEAT_INTERVAL_MS = 25_000;

export function useOfficeSocket(identity: DevelopmentIdentity): {
  sendMove: (payload: PresenceMovePayload) => void;
  updateAttendance: (attendanceStatus: AttendanceStatus) => void;
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
  const updateMemberLifecycle = useOfficeStore((state) => state.updateMemberLifecycle);

  useEffect(() => {
    let isDisposed = false;
    let heartbeatTimer: number | undefined;
    let socket: Socket | null = null;

    const connect = async () => {
      try {
        const session = await createOrRestoreOfficeSession({
          countryCode: identity.countryCode,
          displayName: identity.displayName,
          language: identity.language
        });
        if (isDisposed) {
          return;
        }

        socket = io(`${SERVER_URL}/office`, {
      reconnection: true,
      transports: ["websocket"]
    });
        socketRef.current = socket;

        const handleConnect = () => {
          setConnectionState("connected");
          socket?.emit(SOCKET_EVENT_NAMES.OFFICE_JOIN, {
            displayName: session.member.name,
            guestToken: session.guestToken,
            language: session.member.preferredLanguage,
            memberId: session.member.id,
            teamId: session.member.workspaceId,
            workspaceId: session.member.workspaceId
          });
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
        const handleLifecycleUpdated = (payload: OfficeLifecycleUpdatedPayload) =>
          updateMemberLifecycle(payload.memberId, payload.presence);

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.io.on("reconnect_attempt", handleReconnectAttempt);
        socket.on(SOCKET_EVENT_NAMES.OFFICE_SNAPSHOT, handleSnapshot);
        socket.on(SOCKET_EVENT_NAMES.OFFICE_MEMBER_JOINED, handleMemberJoined);
        socket.on(SOCKET_EVENT_NAMES.OFFICE_MEMBER_LEFT, handleMemberLeft);
        socket.on(SOCKET_EVENT_NAMES.PRESENCE_MOVED, handleMemberMoved);
        socket.on(SOCKET_EVENT_NAMES.MEMBER_STATUS_UPDATED, handleStatusUpdated);
        socket.on(SOCKET_EVENT_NAMES.OFFICE_LIFECYCLE_UPDATED, handleLifecycleUpdated);
        heartbeatTimer = window.setInterval(() => {
          const self = useOfficeStore.getState().self;
          if (self) {
            socket?.emit(SOCKET_EVENT_NAMES.OFFICE_HEARTBEAT, { avatar: self.avatar });
          }
        }, HEARTBEAT_INTERVAL_MS);
      } catch {
        setConnectionState("disconnected");
      }
    };

    void connect();

    return () => {
      isDisposed = true;
      if (heartbeatTimer) {
        window.clearInterval(heartbeatTimer);
      }
      socket?.disconnect();
      socketRef.current = null;
      setConnectionState("disconnected");
    };
  }, [
    identity,
    removeMember,
    setConnectionState,
    setSnapshot,
    updateMemberPosition,
    updateMemberLifecycle,
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

  const updateAttendance = useCallback((attendanceStatus: AttendanceStatus) => {
    socketRef.current?.emit(SOCKET_EVENT_NAMES.OFFICE_ATTENDANCE_UPDATE, {
      attendanceStatus
    });
  }, []);

  return { sendMove, updateAttendance, updateStatus };
}
