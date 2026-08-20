import type { JSX } from "react";
import { useTranslation } from "react-i18next";

import type {
  LiveKitMeetingParticipant,
  LiveKitMeetingSessionStatus
} from "../model/use-livekit-meeting-session";
import { selectMeetingParticipantPreviews } from "../model/meeting-performance";
import { MeetingParticipantVideoTile } from "./MeetingParticipantVideoTile";

interface MeetingParticipantStripProps {
  participants: LiveKitMeetingParticipant[];
  sessionStatus: LiveKitMeetingSessionStatus;
}

export function MeetingParticipantStrip({
  participants,
  sessionStatus
}: MeetingParticipantStripProps): JSX.Element {
  const { t } = useTranslation();
  const previewParticipants = selectMeetingParticipantPreviews(participants);
  const hiddenParticipantCount = participants.length - previewParticipants.length;

  return (
    <section
      aria-label={t("meetingParticipants.strip.ariaLabel")}
      className="meeting-participant-strip"
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
