import type { JSX } from "react";

import type {
  LiveKitMeetingParticipant,
  LiveKitMeetingSessionStatus
} from "../model/use-livekit-meeting-session";
import { MeetingParticipantVideoTile } from "./MeetingParticipantVideoTile";

interface MeetingParticipantStripProps {
  participants: LiveKitMeetingParticipant[];
  sessionStatus: LiveKitMeetingSessionStatus;
}

export function MeetingParticipantStrip({
  participants,
  sessionStatus
}: MeetingParticipantStripProps): JSX.Element {
  return (
    <section
      aria-label="회의 참가자 영상"
      className="meeting-participant-strip"
    >
      <span className="sr-only" aria-live="polite">
        {getParticipantStripMessage(participants.length, sessionStatus)}
      </span>
      <div className="meeting-participant-scroll" role="list">
        {participants.length > 0 ? (
          participants.map((participant) => (
            <MeetingParticipantVideoTile
              key={participant.identity}
              participant={participant}
            />
          ))
        ) : (
          <div
            aria-label="회의 참가자 정보를 준비하고 있습니다."
            className="meeting-participant-empty"
            role="status"
          />
        )}
      </div>
    </section>
  );
}

function getParticipantStripMessage(
  participantCount: number,
  status: LiveKitMeetingSessionStatus
): string {
  if (status === "connecting" || status === "publishing") {
    return "연결 중";
  }

  if (status === "reconnecting") {
    return "재연결 중";
  }

  if (participantCount === 0) {
    return "참가자 없음";
  }

  return `${participantCount}명 참가 중`;
}
