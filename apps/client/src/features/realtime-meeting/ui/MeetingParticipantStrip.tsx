import type { JSX } from "react";

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
  const previewParticipants = selectMeetingParticipantPreviews(participants);
  const hiddenParticipantCount = participants.length - previewParticipants.length;

  return (
    <section
      aria-label="회의 참가자 영상"
      className="meeting-participant-strip"
    >
      <span className="sr-only" aria-live="polite">
        {getParticipantStripMessage(participants.length, sessionStatus)}
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
            aria-label="회의 참가자 정보를 준비하고 있습니다."
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
