import type { CSSProperties, JSX } from "react";

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
  const participantCount = participants.length;
  const participantCountClassName = `count-${Math.min(
    Math.max(participantCount, 1),
    6
  )}`;

  return (
    <section
      aria-label="확대된 회의 참가자 영상"
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
        {getParticipantGridMessage(participants.length, sessionStatus)}
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
            aria-label="회의 참가자 정보를 준비하고 있습니다."
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
  status: LiveKitMeetingSessionStatus
): string {
  if (status === "connecting" || status === "publishing") {
    return "확대 화면 연결 중";
  }

  if (status === "reconnecting") {
    return "확대 화면 재연결 중";
  }

  if (participantCount === 0) {
    return "확대 화면 참가자 없음";
  }

  return `확대 화면에서 ${participantCount}명 참가 중`;
}
