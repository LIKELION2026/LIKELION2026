import { useMemo, useState, type JSX } from "react";
import { Track } from "livekit-client";
import type { LanguageCode, SubtitleCreatedPayload } from "@likelion2026/shared";

import { useMeetingChat } from "../model/use-meeting-chat";
import { useMeetingSubtitles } from "../model/use-meeting-subtitles";
import type { MeetingSessionController } from "../model/use-meeting-session-controller";
import { useMeetingTranslationPreference } from "../model/use-meeting-translation-preference";
import { MeetingAudioSinks } from "./MeetingAudioSinks";
import { MeetingChatPanel } from "./MeetingChatPanel";
import { MeetingControlBar } from "./MeetingControlBar";
import { MeetingParticipantGrid } from "./MeetingParticipantGrid";
import { MeetingParticipantStrip } from "./MeetingParticipantStrip";
import { MeetingTranslationPreferenceModal } from "./MeetingTranslationPreferenceModal";

interface MeetingRoomOverlayProps {
  controller: MeetingSessionController;
  defaultSourceLanguage?: LanguageCode;
}

export function MeetingRoomOverlay({
  controller,
  defaultSourceLanguage
}: MeetingRoomOverlayProps): JSX.Element {
  const { session } = controller;
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [isExpandedView, setIsExpandedView] = useState(false);
  const canControlMedia =
    session.status === "connected" || session.status === "reconnecting";
  const activeRoomName = canControlMedia ? session.roomName : undefined;
  const translationPreference = useMeetingTranslationPreference({
    defaultSourceLanguage,
    room: controller.room,
    sessionStatus: session.status
  });
  const subtitleState = useMeetingSubtitles(activeRoomName, {
    activatedAt: translationPreference.preference.activatedAt,
    enabled: translationPreference.preference.enabled,
    includeInitialPayloads: false
  });
  const chatState = useMeetingChat({
    localParticipantIdentity: session.participantIdentity,
    participants: session.participants,
    room: controller.room,
    roomName: activeRoomName,
    sessionStatus: session.status,
    translationSubtitles: translationPreference.preference.enabled
      ? subtitleState.subtitles
      : []
  });
  const latestTranslationSubtitle = useMemo(
    () =>
      translationPreference.preference.enabled
        ? subtitleState.subtitles[subtitleState.subtitles.length - 1]
        : undefined,
    [subtitleState.subtitles, translationPreference.preference.enabled]
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
          errorMessage={
            chatState.errorMessage ??
            translationPreference.errorMessage ??
            subtitleState.errorMessage
          }
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
        isTranslationDisabled={session.status !== "connected"}
        isTranslationEnabled={translationPreference.preference.enabled}
        isTranslationUpdating={translationPreference.isSaving}
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
          if (translationPreference.preference.enabled) {
            void translationPreference.turnOff();
            return;
          }

          translationPreference.openModal();
        }}
      />
      {translationPreference.isModalOpen ? (
        <MeetingTranslationPreferenceModal
          errorMessage={translationPreference.errorMessage}
          isSaving={translationPreference.isSaving}
          onClose={translationPreference.closeModal}
          onSave={translationPreference.turnOn}
          preference={translationPreference.preference}
        />
      ) : null}
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
