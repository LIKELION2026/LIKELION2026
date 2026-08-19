import assert from "node:assert/strict";
import test from "node:test";
import type { SubtitleCreatedPayload } from "@likelion2026/shared";

import { filterMeetingSubtitlesAfterActivation } from "../src/features/realtime-meeting/model/meeting-subtitle-activation.ts";

test("keeps only subtitles generated after translation activation", () => {
  const subtitles = [
    createSubtitle("before", "2026-08-19T08:59:59.999Z"),
    createSubtitle("after", "2026-08-19T09:00:00.000Z")
  ];

  assert.deepEqual(
    filterMeetingSubtitlesAfterActivation(
      subtitles,
      "2026-08-19T09:00:00.000Z"
    ).map((subtitle) => subtitle.subtitleId),
    ["after"]
  );
});

test("keeps the legacy Meeting Lab initial buffer when no activation time exists", () => {
  const subtitles = [createSubtitle("legacy", "2026-08-19T08:59:59.999Z")];

  assert.equal(filterMeetingSubtitlesAfterActivation(subtitles, undefined).length, 1);
});

function createSubtitle(
  subtitleId: string,
  occurredAt: string
): SubtitleCreatedPayload {
  return {
    isFinal: true,
    occurredAt,
    revision: 1,
    roomName: "lab-likelion-20260819-meeting-room",
    sourceLanguage: "ko",
    sourceText: "안녕하세요",
    speaker: {
      displayName: "민수",
      participantIdentity: "minsu"
    },
    subtitleId,
    translatedLanguage: "vi",
    translatedText: "Xin chào"
  };
}
