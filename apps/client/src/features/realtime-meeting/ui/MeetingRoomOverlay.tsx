import { useMemo, useState, type JSX } from "react";
import { Track } from "livekit-client";

import type { MeetingSessionController } from "../model/use-meeting-session-controller";
import { MeetingAudioSinks } from "./MeetingAudioSinks";
import { MeetingControlBar } from "./MeetingControlBar";
import { MeetingParticipantGrid } from "./MeetingParticipantGrid";
import { MeetingParticipantStrip } from "./MeetingParticipantStrip";
import { MeetingRoomSessionPanel } from "./MeetingRoomSessionPanel";

interface MeetingRoomOverlayProps {
  controller: MeetingSessionController;
  isOfficeSessionReady: boolean;
  roomLabel: string;
}

export function MeetingRoomOverlay({
  controller,
  isOfficeSessionReady,
  roomLabel
}: MeetingRoomOverlayProps): JSX.Element {
  const { session } = controller;
  const [isExpandedView, setIsExpandedView] = useState(false);
  const [isTranslationEnabled, setIsTranslationEnabled] = useState(false);
  const canControlMedia =
    session.status === "connected" || session.status === "reconnecting";
  const remoteAudioTracks = useMemo(
    () =>
      session.mediaTracks.filter(
        (mediaTrack) =>
          mediaTrack.kind === Track.Kind.Audio && !mediaTrack.isLocal
      ),
    [session.mediaTracks]
  );

  return (
    <div
      aria-label="인게임 회의 오버레이"
      className={[
        "meeting-room-overlay",
        isExpandedView ? "expanded" : ""
      ]
        .filter(Boolean)
        .join(" ")}
      data-office-keyboard-scope
    >
      <MeetingParticipantStrip
        participants={session.participants}
        sessionStatus={session.status}
      />
      {isExpandedView ? (
        <MeetingParticipantGrid
          participants={session.participants}
          sessionStatus={session.status}
        />
      ) : null}
      <aside aria-label="회의 우측 패널" className="meeting-room-side-panel">
        <MeetingRoomSessionPanel
          controller={controller}
          isOfficeSessionReady={isOfficeSessionReady}
          roomLabel={roomLabel}
        />
        <section
          aria-label="채팅과 번역 패널 슬롯"
          className="meeting-room-panel-slot"
        >
          <p>채팅 · AI 번역 패널 슬롯</p>
          <span>#133, #134에서 이 영역에 메시지와 언어 설정을 연결합니다.</span>
        </section>
      </aside>
      <MeetingControlBar
        canControlMedia={canControlMedia}
        extraControlSlot={
          <MeetingAudioSinks
            playbackButtonClassName="meeting-control-button compact"
            playbackButtonLabel="오디오 재생"
            remoteAudioTracks={remoteAudioTracks}
          />
        }
        isCameraEnabled={session.isCameraEnabled}
        isCameraUpdating={session.isCameraUpdating}
        isExpandedView={isExpandedView}
        isLeaving={controller.status === "leaving"}
        isMicrophoneEnabled={session.isMicrophoneEnabled}
        isMicrophoneUpdating={session.isMicrophoneUpdating}
        isTranslationEnabled={isTranslationEnabled}
        onCameraToggle={() => {
          void controller.setCameraEnabled(!session.isCameraEnabled);
        }}
        onExpandedViewToggle={() => {
          setIsExpandedView((currentState) => !currentState);
        }}
        onMicrophoneToggle={() => {
          void controller.setMicrophoneEnabled(!session.isMicrophoneEnabled);
        }}
        onTranslationToggle={() => {
          setIsTranslationEnabled((currentState) => !currentState);
        }}
      />
    </div>
  );
}
