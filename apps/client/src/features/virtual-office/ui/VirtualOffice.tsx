import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import Phaser from "phaser";
import type {
  OfficeSummonRequestedPayload,
  OfficeSummonResolvedPayload
} from "@likelion2026/shared";

import { OfficeScene } from "../core/office-scene";
import { useOfficeConnection } from "../model/office-connection-context";
import { useOfficeStore } from "../model/office-store";
import { useOfficeCalendar } from "../model/use-office-calendar";
import { useOfficeTodos } from "../model/use-office-todos";
import { createPeopleContext } from "../model/people-context";
import { applyCalendarPresence } from "../model/calendar-presence";
import { getOfficeSceneBootstrap } from "../model/office-scene-bootstrap";
import { getOfficeEntryPhase } from "../model/office-entry-phase";
import { OfficeHud } from "./OfficeHud";
import { GuestOnboarding } from "./GuestOnboarding";
import { OfficeTodoPanel } from "./OfficeTodoPanel";
import { OfficeCalendarModal } from "./OfficeCalendarModal";
import { OfficePeoplePanel } from "./OfficePeoplePanel";
import { OfficeSummonModal } from "./OfficeSummonModal";
import { OfficeLoadingScreen } from "./OfficeLoadingScreen";

interface VirtualOfficeProps {
  onOpenMeetingLab: () => void;
}

export function VirtualOffice({ onOpenMeetingLab }: VirtualOfficeProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<OfficeScene | null>(null);
  const [isInsideMeetingRoom, setIsInsideMeetingRoom] = useState(false);
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [isPeoplePanelOpen, setIsPeoplePanelOpen] = useState(false);
  const [isTodoPanelOpen, setIsTodoPanelOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [pendingSummon, setPendingSummon] = useState<OfficeSummonRequestedPayload | null>(null);
  const {
    isPreparingSession,
    isRestoringStoredSession,
    prepareSession,
    registerSocketCallbacks,
    respondToSummon,
    sendMove,
    sendSummonRequest,
    session,
    sessionError,
    updateAttendance,
    updateStatus
  } = useOfficeConnection();
  const connectionState = useOfficeStore((state) => state.connectionState);
  const members = useOfficeStore((state) => state.members);
  const self = useOfficeStore((state) => state.self);
  const sceneBootstrap = useMemo(() => getOfficeSceneBootstrap(self), [self]);
  const entryPhase = getOfficeEntryPhase({
    hasSession: Boolean(session),
    isPreparingSession,
    isRestoringStoredSession,
    isSceneReady
  });
  const todoController = useOfficeTodos(session);
  const calendarController = useOfficeCalendar(session);
  const effectiveMembers = useMemo(
    () => members.map((member) => applyCalendarPresence(member, calendarController.memberStatuses)),
    [calendarController.memberStatuses, members]
  );
  const effectiveSelf = useMemo(
    () => (self ? applyCalendarPresence(self, calendarController.memberStatuses) : null),
    [calendarController.memberStatuses, self]
  );
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
      onCalendarUpdated: calendarController.refresh,
      onTodosUpdated: todoController.refresh
    }),
    [calendarController.refresh, handleSummonRequested, handleSummonResolved, todoController.refresh]
  );

  useEffect(() => registerSocketCallbacks(socketCallbacks), [registerSocketCallbacks, socketCallbacks]);
  const peopleContext = createPeopleContext(
    effectiveMembers,
    todoController.publicTodos,
    effectiveSelf?.memberId
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !sceneBootstrap) {
      return;
    }

    const scene = new OfficeScene({
      initialAvatar: sceneBootstrap,
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
  }, [sendMove, self?.memberId]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !isSceneReady) {
      return;
    }

    scene.syncRemoteMembers(effectiveMembers, self?.memberId);
  }, [effectiveMembers, isSceneReady, self?.memberId]);

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
        memberCount={effectiveMembers.length}
        onAttendanceChange={updateAttendance}
        onOpenCalendar={() => setIsCalendarOpen(true)}
        onOpenPeople={() => setIsPeoplePanelOpen(true)}
        onOpenTodo={() => setIsTodoPanelOpen(true)}
        onStatusChange={updateStatus}
        selfAttendanceStatus={effectiveSelf?.officePresence?.attendanceStatus}
        selfStatus={effectiveSelf?.status}
      />
      <OfficeTodoPanel
        controller={todoController}
        isOpen={isTodoPanelOpen}
        onClose={() => setIsTodoPanelOpen(false)}
      />
      <OfficeCalendarModal
        controller={calendarController}
        isOpen={isCalendarOpen}
        members={effectiveMembers}
        onClose={() => setIsCalendarOpen(false)}
        ownTodos={todoController.ownTodos}
        self={effectiveSelf}
      />
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
      {entryPhase === "loading" ? <OfficeLoadingScreen /> : null}
      {entryPhase === "onboarding" ? (
        <GuestOnboarding
          error={sessionError}
          isSubmitting={isPreparingSession}
          onSubmit={prepareSession}
        />
      ) : null}
    </section>
  );
}
