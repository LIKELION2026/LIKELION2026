import type { MeetingSubtitleStatus } from "./use-meeting-subtitles";

export type MeetingTranslationAvailabilityStatus =
  | "off"
  | "connecting"
  | "ready"
  | "unavailable";

export interface MeetingTranslationAvailability {
  description: string;
  status: MeetingTranslationAvailabilityStatus;
  title: string;
}

interface CreateMeetingTranslationAvailabilityInput {
  errorMessage?: string;
  isEnabled: boolean;
  subtitleStatus: MeetingSubtitleStatus;
}

export function createMeetingTranslationAvailability({
  errorMessage,
  isEnabled,
  subtitleStatus
}: CreateMeetingTranslationAvailabilityInput): MeetingTranslationAvailability {
  if (!isEnabled) {
    return {
      description: "일반 채팅은 계속 사용할 수 있습니다.",
      status: "off",
      title: "AI 번역 꺼짐"
    };
  }

  if (errorMessage || subtitleStatus === "failed") {
    return {
      description:
        errorMessage ?? "자막 서버 연결을 확인한 뒤 다시 시도해 주세요.",
      status: "unavailable",
      title: "AI 번역 연결 실패"
    };
  }

  if (subtitleStatus === "subscribed") {
    return {
      description: "상대방이 말하면 번역이 채팅과 하단 자막에 표시됩니다.",
      status: "ready",
      title: "AI 번역 대기 중"
    };
  }

  return {
    description: "회의방 자막 채널을 준비하고 있습니다.",
    status: "connecting",
    title: "AI 번역 연결 중"
  };
}
