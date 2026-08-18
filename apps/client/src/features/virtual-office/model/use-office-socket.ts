import { useCallback, useEffect, useRef } from "react";
import {
  SOCKET_EVENT_NAMES,
  type GuestOfficeSessionResponse,
  type MemberStatus,
  type MemberStatusUpdatedPayload,
  type OfficeCalendarUpdatedPayload,
  type OfficeMemberJoinedPayload,
  type OfficeMemberLeftPayload,
  type OfficeLifecycleUpdatedPayload,
  type OfficeSummonRequestedPayload,
  type OfficeSummonResolvedPayload,
  type OfficeTodosUpdatedPayload,
  type AttendanceStatus,
  type LocalMovementCommand,
  type OfficeSnapshotPayload,
  type PresenceMovePayload,
  type PresenceMovedPayload
} from "@likelion2026/shared";
import { io, type Socket } from "socket.io-client";

import { SERVER_URL } from "../../../shared/config/environment";
import { useOfficeStore } from "./office-store";

const MOVEMENT_INTERVAL_MS = 60;
const HEARTBEAT_INTERVAL_MS = 25_000;

export interface OfficeSocketCallbacks {
  onCalendarUpdated?: () => void;
  onSummonRequested?: (payload: OfficeSummonRequestedPayload) => void;
  onSummonResolved?: (payload: OfficeSummonResolvedPayload) => void;
  onTodosUpdated?: () => void;
}

export function useOfficeSocket(
  session: GuestOfficeSessionResponse | null,
  callbacks: OfficeSocketCallbacks = {}
): {
  respondToSummon: (requestId: string, decision: "accepted" | "declined") => void;
  sendSummonRequest: (targetMemberId: string) => boolean;
  sendMove: (payload: LocalMovementCommand) => void;
  updateAttendance: (attendanceStatus: AttendanceStatus) => void;
  updateStatus: (status: MemberStatus) => void;
} {
  const socketRef = useRef<Socket | null>(null);
  const callbacksRef = useRef(callbacks);
  const lastMoveRef = useRef<LocalMovementCommand & { sentAt: number } | null>(null);
  const nextMoveSequenceRef = useRef(0);
  const lastReceivedSequenceRef = useRef(new Map<string, number>());
  const setConnectionState = useOfficeStore((state) => state.setConnectionState);
  const setSnapshot = useOfficeStore((state) => state.setSnapshot);
  const upsertMember = useOfficeStore((state) => state.upsertMember);
  const removeMember = useOfficeStore((state) => state.removeMember);
  const updateMemberPosition = useOfficeStore((state) => state.updateMemberPosition);
  const updateMemberStatus = useOfficeStore((state) => state.updateMemberStatus);
  const updateMemberLifecycle = useOfficeStore((state) => state.updateMemberLifecycle);
  const updateSelfPosition = useOfficeStore((state) => state.updateSelfPosition);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    let heartbeatTimer: number | undefined;
    let socket: Socket | null = null;
    if (!session) {
      setConnectionState("disconnected");
      return;
    }

    socket = io(`${SERVER_URL}/office`, {
      reconnection: true,
      transports: ["websocket"]
    });
    socketRef.current = socket;

    const handleConnect = () => {
      nextMoveSequenceRef.current = 0;
      lastReceivedSequenceRef.current.clear();
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
    const handleSnapshot = (payload: OfficeSnapshotPayload) => {
      lastReceivedSequenceRef.current.clear();
      setSnapshot(payload.self, payload.members);
    };
    const handleMemberJoined = (payload: OfficeMemberJoinedPayload) => {
      lastReceivedSequenceRef.current.delete(payload.member.memberId);
      upsertMember(payload.member);
    };
    const handleMemberLeft = (payload: OfficeMemberLeftPayload) => {
      lastReceivedSequenceRef.current.delete(payload.memberId);
      removeMember(payload.memberId);
    };
    const handleMemberMoved = (payload: PresenceMovedPayload) => {
      const previousSequence = lastReceivedSequenceRef.current.get(payload.memberId);
      if (previousSequence !== undefined && payload.sequence <= previousSequence) {
        return;
      }
      lastReceivedSequenceRef.current.set(payload.memberId, payload.sequence);
      updateMemberPosition(payload);
    };
    const handleStatusUpdated = (payload: MemberStatusUpdatedPayload) =>
      updateMemberStatus(payload.member);
    const handleLifecycleUpdated = (payload: OfficeLifecycleUpdatedPayload) =>
      updateMemberLifecycle(payload.memberId, payload.presence);
    const handleTodosUpdated = (payload: OfficeTodosUpdatedPayload) => {
      if (payload.teamId === session.member.workspaceId && payload.memberId !== session.member.id) {
        callbacksRef.current.onTodosUpdated?.();
      }
    };
    const handleCalendarUpdated = (payload: OfficeCalendarUpdatedPayload) => {
      if (payload.teamId === session.member.workspaceId) {
        callbacksRef.current.onCalendarUpdated?.();
      }
    };
    const handleSummonRequested = (payload: OfficeSummonRequestedPayload) => {
      if (payload.teamId === session.member.workspaceId) {
        callbacksRef.current.onSummonRequested?.(payload);
      }
    };
    const handleSummonResolved = (payload: OfficeSummonResolvedPayload) => {
      if (payload.teamId === session.member.workspaceId) {
        callbacksRef.current.onSummonResolved?.(payload);
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.io.on("reconnect_attempt", handleReconnectAttempt);
    socket.on(SOCKET_EVENT_NAMES.OFFICE_SNAPSHOT, handleSnapshot);
    socket.on(SOCKET_EVENT_NAMES.OFFICE_MEMBER_JOINED, handleMemberJoined);
    socket.on(SOCKET_EVENT_NAMES.OFFICE_MEMBER_LEFT, handleMemberLeft);
    socket.on(SOCKET_EVENT_NAMES.PRESENCE_MOVED, handleMemberMoved);
    socket.on(SOCKET_EVENT_NAMES.MEMBER_STATUS_UPDATED, handleStatusUpdated);
    socket.on(SOCKET_EVENT_NAMES.OFFICE_LIFECYCLE_UPDATED, handleLifecycleUpdated);
    socket.on(SOCKET_EVENT_NAMES.OFFICE_TODOS_UPDATED, handleTodosUpdated);
    socket.on(SOCKET_EVENT_NAMES.OFFICE_CALENDAR_UPDATED, handleCalendarUpdated);
    socket.on(SOCKET_EVENT_NAMES.OFFICE_SUMMON_REQUESTED, handleSummonRequested);
    socket.on(SOCKET_EVENT_NAMES.OFFICE_SUMMON_RESOLVED, handleSummonResolved);
    heartbeatTimer = window.setInterval(() => {
      socket?.emit(SOCKET_EVENT_NAMES.OFFICE_HEARTBEAT, {});
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (heartbeatTimer) {
        window.clearInterval(heartbeatTimer);
      }
      socket?.off("connect", handleConnect);
      socket?.off("disconnect", handleDisconnect);
      socket?.io.off("reconnect_attempt", handleReconnectAttempt);
      socket?.disconnect();
      socketRef.current = null;
      lastReceivedSequenceRef.current.clear();
      setConnectionState("disconnected");
    };
  }, [
    session,
    removeMember,
    setConnectionState,
    setSnapshot,
    updateMemberPosition,
    updateMemberLifecycle,
    updateMemberStatus,
    upsertMember
  ]);

  const sendMove = useCallback((payload: LocalMovementCommand) => {
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

    const sequencedPayload: PresenceMovePayload = {
      ...payload,
      sequence: nextMoveSequenceRef.current
    };
    nextMoveSequenceRef.current += 1;
    updateSelfPosition(payload);
    socket.emit(SOCKET_EVENT_NAMES.PRESENCE_MOVE, sequencedPayload);
    lastMoveRef.current = { ...payload, sentAt: now };
  }, [updateSelfPosition]);

  const updateStatus = useCallback((status: MemberStatus) => {
    socketRef.current?.emit(SOCKET_EVENT_NAMES.MEMBER_STATUS_UPDATE, { status });
  }, []);

  const updateAttendance = useCallback((attendanceStatus: AttendanceStatus) => {
    socketRef.current?.emit(SOCKET_EVENT_NAMES.OFFICE_ATTENDANCE_UPDATE, {
      attendanceStatus
    });
  }, []);

  const sendSummonRequest = useCallback((targetMemberId: string) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      return false;
    }

    socket.emit(SOCKET_EVENT_NAMES.OFFICE_SUMMON_REQUEST, { targetMemberId });
    return true;
  }, []);

  const respondToSummon = useCallback(
    (requestId: string, decision: "accepted" | "declined") => {
      socketRef.current?.emit(SOCKET_EVENT_NAMES.OFFICE_SUMMON_RESPOND, { decision, requestId });
    },
    []
  );

  return { respondToSummon, sendMove, sendSummonRequest, updateAttendance, updateStatus };
}
