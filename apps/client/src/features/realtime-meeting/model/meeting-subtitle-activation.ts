import type { SubtitleCreatedPayload } from "@likelion2026/shared";

export function filterMeetingSubtitlesAfterActivation(
  subtitles: SubtitleCreatedPayload[],
  activatedAt: string | undefined
): SubtitleCreatedPayload[] {
  return subtitles.filter((subtitle) =>
    isMeetingSubtitleAfterActivation(subtitle, activatedAt)
  );
}

export function isMeetingSubtitleAfterActivation(
  subtitle: SubtitleCreatedPayload,
  activatedAt: string | undefined
): boolean {
  if (!activatedAt) {
    return true;
  }

  const activationTimestamp = Date.parse(activatedAt);
  const subtitleTimestamp = Date.parse(subtitle.occurredAt);

  if (Number.isNaN(activationTimestamp) || Number.isNaN(subtitleTimestamp)) {
    return false;
  }

  return subtitleTimestamp >= activationTimestamp;
}
