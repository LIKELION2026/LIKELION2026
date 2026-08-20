import {
  VideoPresets,
  type TrackPublishOptions,
  type VideoCaptureOptions
} from "livekit-client";

export const MEETING_CAMERA_MAX_FRAMERATE = 15;
export const MEETING_RENDERED_PARTICIPANT_LIMIT = 6;

export const MEETING_CAMERA_CAPTURE_OPTIONS: VideoCaptureOptions = {
  frameRate: {
    ideal: MEETING_CAMERA_MAX_FRAMERATE,
    max: MEETING_CAMERA_MAX_FRAMERATE
  },
  resolution: {
    ...VideoPresets.h720.resolution,
    frameRate: MEETING_CAMERA_MAX_FRAMERATE
  }
};

export const MEETING_CAMERA_PUBLISH_OPTIONS: TrackPublishOptions = {
  simulcast: true,
  videoEncoding: {
    ...VideoPresets.h720.encoding,
    maxFramerate: MEETING_CAMERA_MAX_FRAMERATE
  },
  videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360]
};

export interface MeetingParticipantRenderCandidate {
  identity: string;
  isLocal: boolean;
  isSpeaking: boolean;
}

export function selectMeetingParticipantPreviews<
  TParticipant extends MeetingParticipantRenderCandidate
>(
  participants: TParticipant[],
  limit = MEETING_RENDERED_PARTICIPANT_LIMIT
): TParticipant[] {
  if (participants.length <= limit) {
    return participants;
  }

  return [...participants]
    .sort(compareMeetingParticipantPreviewPriority)
    .slice(0, limit);
}

function compareMeetingParticipantPreviewPriority<
  TParticipant extends MeetingParticipantRenderCandidate
>(left: TParticipant, right: TParticipant): number {
  const leftScore = getMeetingParticipantPreviewPriority(left);
  const rightScore = getMeetingParticipantPreviewPriority(right);

  if (leftScore !== rightScore) {
    return rightScore - leftScore;
  }

  return left.identity.localeCompare(right.identity);
}

function getMeetingParticipantPreviewPriority({
  isLocal,
  isSpeaking
}: MeetingParticipantRenderCandidate): number {
  return (isLocal ? 2 : 0) + (isSpeaking ? 1 : 0);
}
