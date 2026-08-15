import { useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import Phaser from "phaser";

import { getDevelopmentIdentity } from "../../../shared/lib/development-identity";
import { OFFICE_SCENE_KEY, OfficeScene } from "../core/office-scene";
import { useOfficeStore } from "../model/office-store";
import { useOfficeSocket } from "../model/use-office-socket";
import { OfficeHud } from "./OfficeHud";

interface VirtualOfficeProps {
  onOpenMeetingLab: () => void;
}

export function VirtualOffice({ onOpenMeetingLab }: VirtualOfficeProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [isInsideMeetingRoom, setIsInsideMeetingRoom] = useState(false);
  const identity = useMemo(getDevelopmentIdentity, []);
  const connectionState = useOfficeStore((state) => state.connectionState);
  const members = useOfficeStore((state) => state.members);
  const self = useOfficeStore((state) => state.self);
  const { sendMove, updateStatus } = useOfficeSocket(identity);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scene = new OfficeScene({ onLocalMovement: sendMove });
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

    const handleMeetingRoomState = (isInside: boolean) => setIsInsideMeetingRoom(isInside);
    scene.events.on("meeting-room-state", handleMeetingRoomState);

    return () => {
      scene.events.off("meeting-room-state", handleMeetingRoomState);
      game.destroy(true);
      gameRef.current = null;
    };
  }, [sendMove]);

  useEffect(() => {
    const game = gameRef.current;
    if (!game) {
      return;
    }

    const scene = game.scene.getScene(OFFICE_SCENE_KEY) as OfficeScene;
    scene.syncRemoteMembers(members, self?.memberId);
  }, [members, self?.memberId]);

  useEffect(() => {
    if (!self || !gameRef.current) {
      return;
    }

    const scene = gameRef.current.scene.getScene(OFFICE_SCENE_KEY) as OfficeScene;
    scene.setLocalPosition(self.avatar.x, self.avatar.y);
  }, [self]);

  return (
    <section className="virtual-office" aria-label="가상 오피스">
      <div className="office-canvas" ref={containerRef} />
      <OfficeHud
        connectionState={connectionState}
        memberCount={members.length}
        onStatusChange={updateStatus}
        selfStatus={self?.status}
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
    </section>
  );
}
