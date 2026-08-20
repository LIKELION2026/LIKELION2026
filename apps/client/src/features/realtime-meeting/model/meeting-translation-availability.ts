import type { MeetingSubtitleStatus } from "./use-meeting-subtitles";

export type MeetingTranslationAvailabilityStatus =
  | "off"
  | "connecting"
  | "ready"
  | "unavailable";

export interface MeetingTranslationAvailability {
  descriptionKey: string;
  errorMessage?: string;
  status: MeetingTranslationAvailabilityStatus;
  titleKey: string;
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
      descriptionKey: "meetingTranslationAvailability.off.description",
      status: "off",
      titleKey: "meetingTranslationAvailability.off.title"
    };
  }

  if (errorMessage || subtitleStatus === "failed") {
    return {
      descriptionKey: "meetingTranslationAvailability.unavailable.description",
      errorMessage,
      status: "unavailable",
      titleKey: "meetingTranslationAvailability.unavailable.title"
    };
  }

  if (subtitleStatus === "subscribed") {
    return {
      descriptionKey: "meetingTranslationAvailability.ready.description",
      status: "ready",
      titleKey: "meetingTranslationAvailability.ready.title"
    };
  }

  return {
    descriptionKey: "meetingTranslationAvailability.connecting.description",
    status: "connecting",
    titleKey: "meetingTranslationAvailability.connecting.title"
  };
}
