export const MEETING_GRID_PREVIEW_PARTICIPANT_THRESHOLD = 3;

export type MeetingParticipantPreviewLayout = "strip" | "grid";

export function getMeetingParticipantPreviewLayout(
  participantCount: number
): MeetingParticipantPreviewLayout {
  return participantCount >= MEETING_GRID_PREVIEW_PARTICIPANT_THRESHOLD
    ? "grid"
    : "strip";
}

export function getMeetingParticipantGridColumnCount(
  participantCount: number
): number {
  if (participantCount <= 1) {
    return 1;
  }

  if (participantCount <= 4) {
    return 2;
  }

  return 3;
}
