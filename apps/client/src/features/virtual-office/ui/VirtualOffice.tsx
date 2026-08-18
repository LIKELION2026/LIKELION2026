import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import Phaser from "phaser";
import type {
  GuestOfficeSessionResponse,
  OfficeSummonRequestedPayload,
  OfficeSummonResolvedPayload
} from "@likelion2026/shared";

import {
  getStoredGuestProfile,
  saveGuestProfile,
  type GuestProfile
} from "../../../shared/lib/development-identity";
import { createOrRestoreOfficeSession } from "../api/create-office-session";
import { OfficeScene } from "../core/office-scene";
import { useOfficeStore } from "../model/office-store";
import { useOfficeSocket } from "../model/use-office-socket";
import { useOfficeCalendar } from "../model/use-office-calendar";
import { useOfficeTodos } from "../model/use-office-todos";
import { createPeopleContext } from "../model/people-context";
import { OfficeHud } from "./OfficeHud";
import { GuestOnboarding } from "./GuestOnboarding";
import { OfficeTodoPanel } from "./OfficeTodoPanel";
import { OfficeCalendarPanelSlot } from "./OfficeCalendarPanelSlot";
import { OfficePeoplePanel } from "./OfficePeoplePanel";
import { OfficeSummonModal } from "./OfficeSummonModal";
import { useRequestFeedback } from "../../../app/request-feedback";

interface VirtualOfficeProps {
  onOpenMeetingLab: () => void;
}

export function VirtualOffice({ onOpenMeetingLab }: VirtualOfficeProps): JSX.Element {
  const { showError } = useRequestFeedback();
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<OfficeScene | null>(null);
  const [isInsideMeetingRoom, setIsInsideMeetingRoom] = useState(false);
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [session, setSession] = useState<GuestOfficeSessionResponse | null>(null);
  const [isPreparingSession, setIsPreparingSession] = useState(false);
  const [isPeoplePanelOpen, setIsPeoplePanelOpen] = useState(false);
  const [isTodoPanelOpen, setIsTodoPanelOpen] = useState(false);
  const [pendingSummon, setPendingSummon] = useState<OfficeSummonRequestedPayload | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [storedProfile, setStoredProfile] = useState<GuestProfile | null>(() =>
    getStoredGuestProfile()
  );
  const didRestoreStoredProfile = useRef(false);
  const connectionState = useOfficeStore((state) => state.connectionState);
  const members = useOfficeStore((state) => state.members);
  const self = useOfficeStore((state) => state.self);
  const todoController = useOfficeTodos(session);
  const handleSummonRequested = useCallback((request: OfficeSummonRequestedPayload) => {
    setPendingSummon(request);
  }, []);
  const handleSummonResolved = useCallback(
    (resolution: OfficeSummonResolvedPayload) => {
      if (
        resolution.decision === "accepted" &&
        resolution.targetMemberId === session?.member.id &&
        resolution.targetPosition
      ) {
        sceneRef.current?.moveLocalAvatarNear(
          resolution.targetPosition.x,
          resolution.targetPosition.y
        );
      }
      if (resolution.requestId === pendingSummon?.requestId) {
        setPendingSummon(null);
      }
    },
    [pendingSummon?.requestId, session?.member.id]
  );
  const socketCallbacks = useMemo(
    () => ({
      onSummonRequested: handleSummonRequested,
      onSummonResolved: handleSummonResolved,
      onTodosUpdated: todoController.refresh
    }),
    [handleSummonRequested, handleSummonResolved, todoController.refresh]
  );
  const { respondToSummon, sendMove, sendSummonRequest, updateAttendance, updateStatus } = useOfficeSocket(
    session,
    socketCallbacks
  );
  const calendarController = useOfficeCalendar(session);
  const peopleContext = createPeopleContext(
    members,
    todoController.publicTodos,
    self?.memberId
  );

  const prepareSession = useCallback(async (profile: GuestProfile) => {
    setIsPreparingSession(true);
    setSessionError(null);
    try {
      const nextSession = await createOrRestoreOfficeSession(profile);
      saveGuestProfile(profile);
      setSession(nextSession);
      setStoredProfile(profile);
    } catch (error) {
      setSession(null);
      const message = error instanceof Error ? error.message : "오피스 세션을 준비하지 못했습니다.";
      setSessionError(message);
      showError(error, "오피스 세션을 준비하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setIsPreparingSession(false);
    }
  }, [showError]);

  useEffect(() => {
    if (storedProfile && !didRestoreStoredProfile.current) {
      didRestoreStoredProfile.current = true;
      void prepareSession(storedProfile);
    }
  }, [prepareSession, storedProfile]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scene = new OfficeScene({
      onLocalMovement: sendMove,
      onMeetingRoomState: setIsInsideMeetingRoom,
      onReady: () => setIsSceneReady(true)
    });
    sceneRef.current = scene;
    setIsSceneReady(false);
    const game = new Phaser.Game({
      backgroundColor: "#dbe5ef",
      parent: container,
      physics: {
        arcade: {
          debug: false,
          gravity: { x: 0, y: 0 }
        },
        default: "arcade"
      },
      pixelArt: true,
      render: {
        roundPixels: true
      },
      scale: {
        autoCenter: Phaser.Scale.CENTER_BOTH,
        mode: Phaser.Scale.RESIZE
      },
      scene: [scene],
      type: Phaser.AUTO
    });
    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
      setIsSceneReady(false);
    };
  }, [sendMove]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !isSceneReady) {
      return;
    }

    scene.syncRemoteMembers(members, self?.memberId);
  }, [isSceneReady, members, self?.memberId]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!self || !scene || !isSceneReady) {
      return;
    }

    scene.setLocalPosition(self.avatar.x, self.avatar.y);
  }, [isSceneReady, self?.memberId]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !isSceneReady) {
      return;
    }

    scene.setLocalAvatarId(session?.member.avatarId);
  }, [isSceneReady, session?.member.avatarId]);

  return (
    <section className="virtual-office" aria-label="가상 오피스">
      <div className="office-canvas" ref={containerRef} />
      <OfficeHud
        connectionState={connectionState}
        memberCount={members.length}
        onAttendanceChange={updateAttendance}
        onOpenPeople={() => setIsPeoplePanelOpen(true)}
        onOpenTodo={() => setIsTodoPanelOpen(true)}
        onStatusChange={updateStatus}
        selfAttendanceStatus={self?.officePresence?.attendanceStatus}
        selfStatus={self?.status}
      />
      <OfficeTodoPanel
        controller={todoController}
        isOpen={isTodoPanelOpen}
        onClose={() => setIsTodoPanelOpen(false)}
      />
      <OfficeCalendarPanelSlot controller={calendarController} />
      <OfficePeoplePanel
        isOpen={isPeoplePanelOpen}
        members={peopleContext}
        onClose={() => setIsPeoplePanelOpen(false)}
        onFocusMember={(context) =>
          sceneRef.current?.moveLocalAvatarNear(context.member.avatar.x, context.member.avatar.y)
        }
        onRequestSummon={(context) => sendSummonRequest(context.member.memberId)}
        todoError={todoController.error}
        todoIsLoading={todoController.isLoading}
      />
      <OfficeSummonModal
        onRespond={(decision) => {
          if (pendingSummon) {
            respondToSummon(pendingSummon.requestId, decision);
          }
        }}
        request={pendingSummon}
      />
      {isInsideMeetingRoom ? (
        <aside className="meeting-prompt">
          <h2>회의실에 들어왔습니다</h2>
          <p>회의 참여를 선택하면 Meeting Lab에서 LiveKit 연결을 테스트할 수 있습니다.</p>
          <button className="primary-button" onClick={onOpenMeetingLab} type="button">
            Meeting Lab 열기
          </button>
        </aside>
      ) : null}
      {!session ? (
        <GuestOnboarding
          error={sessionError}
          isSubmitting={isPreparingSession}
          onSubmit={prepareSession}
        />
      ) : null}
    </section>
  );
}
