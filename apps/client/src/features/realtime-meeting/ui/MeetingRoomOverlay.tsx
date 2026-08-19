import { useMemo, useState, type JSX } from "react";
import { Track } from "livekit-client";
import type { SubtitleCreatedPayload } from "@likelion2026/shared";

import { useMeetingChat } from "../model/use-meeting-chat";
import { useMeetingSubtitles } from "../model/use-meeting-subtitles";
import type { MeetingSessionController } from "../model/use-meeting-session-controller";
import { MeetingAudioSinks } from "./MeetingAudioSinks";
import { MeetingChatPanel } from "./MeetingChatPanel";
import { MeetingControlBar } from "./MeetingControlBar";
import { MeetingParticipantGrid } from "./MeetingParticipantGrid";
import { MeetingParticipantStrip } from "./MeetingParticipantStrip";

interface MeetingRoomOverlayProps {
  controller: MeetingSessionController;
}

export function MeetingRoomOverlay({
  controller
}: MeetingRoomOverlayProps): JSX.Element {
  const { session } = controller;
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [isExpandedView, setIsExpandedView] = useState(false);
  const [isTranslationEnabled, setIsTranslationEnabled] = useState(false);
  const canControlMedia =
    session.status === "connected" || session.status === "reconnecting";
  const activeRoomName = canControlMedia ? session.roomName : undefined;
  const subtitleState = useMeetingSubtitles(activeRoomName);
  const chatState = useMeetingChat({
    localParticipantIdentity: session.participantIdentity,
    participants: session.participants,
    room: controller.room,
    roomName: activeRoomName,
    sessionStatus: session.status,
    translationSubtitles: isTranslationEnabled ? subtitleState.subtitles : []
  });
  const latestTranslationSubtitle = useMemo(
    () =>
      isTranslationEnabled
        ? subtitleState.subtitles[subtitleState.subtitles.length - 1]
        : undefined,
    [isTranslationEnabled, subtitleState.subtitles]
  );
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
      <aside
        aria-label="회의 채팅 패널"
        className={[
          "meeting-room-side-panel",
          isChatCollapsed ? "collapsed" : ""
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <MeetingChatPanel
          errorMessage={chatState.errorMessage ?? subtitleState.errorMessage}
          messages={chatState.messages}
          onCollapsedChange={setIsChatCollapsed}
          onDeleteMessage={chatState.deleteMessage}
          onRetryMessage={chatState.retryMessage}
          onSendMessage={chatState.sendMessage}
          status={chatState.status}
        />
      </aside>
      {latestTranslationSubtitle ? (
        <MeetingLiveTranslationCaption subtitle={latestTranslationSubtitle} />
      ) : null}
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

function MeetingLiveTranslationCaption({
  subtitle
}: {
  subtitle: SubtitleCreatedPayload;
}): JSX.Element {
  return (
    <section
      aria-label="실시간 AI 번역"
      aria-live="polite"
      className={`meeting-live-translation-caption ${
        subtitle.isFinal ? "final" : "partial"
      }`}
    >
      <span>{subtitle.speaker.displayName}</span>
      <p>{subtitle.translatedText || subtitle.sourceText}</p>
    </section>
  );
}
