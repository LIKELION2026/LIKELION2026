import assert from "node:assert/strict";
import test from "node:test";
import type { SubtitleCreatedPayload } from "@likelion2026/shared";

import {
  MEETING_SUBTITLE_HISTORY_LIMIT,
  upsertMeetingSubtitlePayloads
} from "../src/features/realtime-meeting/model/meeting-subtitle-buffer.ts";

function subtitle(
  subtitleId: string,
  revision: number,
  seconds: number
): SubtitleCreatedPayload {
  return {
    isFinal: revision > 1,
    occurredAt: new Date(Date.UTC(2026, 7, 20, 9, 0, seconds)).toISOString(),
    revision,
    roomName: "meeting-room",
    sourceLanguage: "ko",
    sourceText: `원문 ${subtitleId} rev${revision}`,
    speaker: {
      displayName: "민수",
      participantIdentity: "minsu"
    },
    subtitleId,
    translatedLanguage: "vi",
    translatedText: `번역 ${subtitleId} rev${revision}`
  };
}

test("updates the same utterance instead of appending partial subtitle revisions", () => {
  const messages = upsertMeetingSubtitlePayloads(
    [subtitle("utterance-1", 1, 1)],
    [subtitle("utterance-1", 2, 2)]
  );

  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.revision, 2);
  assert.equal(messages[0]?.translatedText, "번역 utterance-1 rev2");
});

test("ignores stale subtitle revisions that arrive late", () => {
  const messages = upsertMeetingSubtitlePayloads(
    [subtitle("utterance-1", 3, 3)],
    [subtitle("utterance-1", 2, 2)]
  );

  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.revision, 3);
});

test("caps subtitle payloads to the rendered meeting history budget", () => {
  const subtitles = Array.from(
    { length: MEETING_SUBTITLE_HISTORY_LIMIT + 2 },
    (_, index) => subtitle(`utterance-${index}`, 1, index)
  );

  const cappedSubtitles = upsertMeetingSubtitlePayloads([], subtitles);

  assert.equal(cappedSubtitles.length, MEETING_SUBTITLE_HISTORY_LIMIT);
  assert.equal(cappedSubtitles[0]?.subtitleId, "utterance-2");
  assert.equal(
    cappedSubtitles[cappedSubtitles.length - 1]?.subtitleId,
    `utterance-${MEETING_SUBTITLE_HISTORY_LIMIT + 1}`
  );
});
