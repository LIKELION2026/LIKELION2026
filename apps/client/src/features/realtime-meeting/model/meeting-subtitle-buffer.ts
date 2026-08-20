import type { SubtitleCreatedPayload } from "@likelion2026/shared";

export const MEETING_SUBTITLE_HISTORY_LIMIT = 100;

export function upsertMeetingSubtitlePayloads(
  currentSubtitles: SubtitleCreatedPayload[],
  incomingSubtitles: SubtitleCreatedPayload[],
  limit = MEETING_SUBTITLE_HISTORY_LIMIT
): SubtitleCreatedPayload[] {
  const subtitleById = new Map(
    currentSubtitles.map((subtitle) => [subtitle.subtitleId, subtitle])
  );
  let didChange = false;

  incomingSubtitles.forEach((subtitle) => {
    const existingSubtitle = subtitleById.get(subtitle.subtitleId);

    if (existingSubtitle && existingSubtitle.revision > subtitle.revision) {
      return;
    }

    subtitleById.set(subtitle.subtitleId, subtitle);
    didChange = true;
  });

  if (!didChange) {
    return currentSubtitles;
  }

  return limitMeetingSubtitlePayloads(
    [...subtitleById.values()].sort(compareMeetingSubtitlePayloads),
    limit
  );
}

function limitMeetingSubtitlePayloads(
  subtitles: SubtitleCreatedPayload[],
  limit: number
): SubtitleCreatedPayload[] {
  if (subtitles.length <= limit) {
    return subtitles;
  }

  return subtitles.slice(subtitles.length - limit);
}

function compareMeetingSubtitlePayloads(
  left: SubtitleCreatedPayload,
  right: SubtitleCreatedPayload
): number {
  const occurredAtDifference =
    toTimestamp(left.occurredAt) - toTimestamp(right.occurredAt);

  if (occurredAtDifference !== 0) {
    return occurredAtDifference;
  }

  return left.subtitleId.localeCompare(right.subtitleId);
}

function toTimestamp(value: string): number {
  const timestamp = Date.parse(value);

  return Number.isNaN(timestamp) ? 0 : timestamp;
}
