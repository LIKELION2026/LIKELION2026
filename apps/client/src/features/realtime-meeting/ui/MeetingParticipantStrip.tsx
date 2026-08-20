import type { CSSProperties, JSX } from "react";
import { useTranslation } from "react-i18next";

import type {
  LiveKitMeetingParticipant,
  LiveKitMeetingSessionStatus
} from "../model/use-livekit-meeting-session";
import {
  getMeetingParticipantGridColumnCount,
  type MeetingParticipantPreviewLayout
} from "../model/meeting-participant-layout";
import { selectMeetingParticipantPreviews } from "../model/meeting-performance";
import { MeetingParticipantVideoTile } from "./MeetingParticipantVideoTile";

interface MeetingParticipantStripProps {
  layout: MeetingParticipantPreviewLayout;
  participants: LiveKitMeetingParticipant[];
  sessionStatus: LiveKitMeetingSessionStatus;
}

export function MeetingParticipantStrip({
  layout,
  participants,
  sessionStatus
}: MeetingParticipantStripProps): JSX.Element {
  const { t } = useTranslation();
  const previewParticipants = selectMeetingParticipantPreviews(participants);
  const hiddenParticipantCount = participants.length - previewParticipants.length;
  const participantCountClassName = `count-${Math.min(
    Math.max(previewParticipants.length, 1),
    6
  )}`;
  const layoutStyle =
    layout === "grid"
      ? ({
          "--meeting-strip-grid-columns": String(
            getMeetingParticipantGridColumnCount(previewParticipants.length)
          )
        } as CSSProperties)
      : undefined;

  return (
    <section
      aria-label={t("meetingParticipants.strip.ariaLabel")}
      className={[
        "meeting-participant-strip",
        `layout-${layout}`,
        participantCountClassName
      ].join(" ")}
      style={layoutStyle}
    >
      <span className="sr-only" aria-live="polite">
        {getParticipantStripMessage(participants.length, sessionStatus, t)}
      </span>
      <div className="meeting-participant-scroll" role="list">
        {previewParticipants.length > 0 ? (
          previewParticipants.map((participant) => (
            <MeetingParticipantVideoTile
              key={participant.identity}
              participant={participant}
            />
          ))
        ) : (
          <div
            aria-label={t("meetingParticipants.emptyAriaLabel")}
            className="meeting-participant-empty"
            role="status"
          />
        )}
        {hiddenParticipantCount > 0 ? (
          <div className="meeting-participant-overflow" role="listitem">
            +{hiddenParticipantCount}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function getParticipantStripMessage(
  participantCount: number,
  status: LiveKitMeetingSessionStatus,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  if (status === "connecting" || status === "publishing") {
    return t("meetingParticipants.strip.connecting");
  }

  if (status === "reconnecting") {
    return t("meetingParticipants.strip.reconnecting");
  }

  if (participantCount === 0) {
    return t("meetingParticipants.strip.empty");
  }

  return t("meetingParticipants.strip.ready", { count: participantCount });
}
