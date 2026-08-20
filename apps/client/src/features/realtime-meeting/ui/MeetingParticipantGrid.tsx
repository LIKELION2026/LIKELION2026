import type { CSSProperties, JSX } from "react";
import { useTranslation } from "react-i18next";

import type {
  LiveKitMeetingParticipant,
  LiveKitMeetingSessionStatus
} from "../model/use-livekit-meeting-session";
import { MeetingParticipantVideoTile } from "./MeetingParticipantVideoTile";

interface MeetingParticipantGridProps {
  participants: LiveKitMeetingParticipant[];
  sessionStatus: LiveKitMeetingSessionStatus;
}

export function MeetingParticipantGrid({
  participants,
  sessionStatus
}: MeetingParticipantGridProps): JSX.Element {
  const { t } = useTranslation();
  const participantCount = participants.length;
  const participantCountClassName = `count-${Math.min(
    Math.max(participantCount, 1),
    6
  )}`;

  return (
    <section
      aria-label={t("meetingParticipants.expandedAriaLabel")}
      className={["meeting-expanded-grid", participantCountClassName].join(" ")}
      style={
        {
          "--meeting-expanded-columns": getExpandedGridColumnCount(
            participantCount
          )
        } as CSSProperties
      }
    >
      <span className="sr-only" aria-live="polite">
        {getParticipantGridMessage(participants.length, sessionStatus, t)}
      </span>
      <div className="meeting-expanded-grid-content" role="list">
        {participants.length > 0 ? (
          participants.map((participant) => (
            <MeetingParticipantVideoTile
              key={participant.identity}
              participant={participant}
              variant="expanded"
            />
          ))
        ) : (
          <div
            aria-label={t("meetingParticipants.emptyAriaLabel")}
            className="meeting-participant-empty expanded"
            role="status"
          />
        )}
      </div>
    </section>
  );
}

function getExpandedGridColumnCount(participantCount: number): string {
  if (participantCount <= 1) {
    return "1";
  }

  if (participantCount === 2 || participantCount === 4) {
    return "2";
  }

  return "3";
}

function getParticipantGridMessage(
  participantCount: number,
  status: LiveKitMeetingSessionStatus,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  if (status === "connecting" || status === "publishing") {
    return t("meetingParticipants.grid.connecting");
  }

  if (status === "reconnecting") {
    return t("meetingParticipants.grid.reconnecting");
  }

  if (participantCount === 0) {
    return t("meetingParticipants.grid.empty");
  }

  return t("meetingParticipants.grid.ready", { count: participantCount });
}
