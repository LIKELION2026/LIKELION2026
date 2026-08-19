import assert from "node:assert/strict";
import test from "node:test";

import { createMeetingTranslationAvailability } from "../src/features/realtime-meeting/model/meeting-translation-availability.ts";

test("reports translation as off without implying chat is unavailable", () => {
  assert.deepEqual(
    createMeetingTranslationAvailability({
      isEnabled: false,
      subtitleStatus: "idle"
    }),
    {
      description: "일반 채팅은 계속 사용할 수 있습니다.",
      status: "off",
      title: "AI 번역 꺼짐"
    }
  );
});

test("reports a ready waiting state when the subtitle socket is subscribed", () => {
  assert.deepEqual(
    createMeetingTranslationAvailability({
      isEnabled: true,
      subtitleStatus: "subscribed"
    }),
    {
      description: "상대방이 말하면 번역이 채팅과 하단 자막에 표시됩니다.",
      status: "ready",
      title: "AI 번역 대기 중"
    }
  );
});

test("reports connection failure when the subtitle channel fails", () => {
  assert.deepEqual(
    createMeetingTranslationAvailability({
      errorMessage: "websocket failed",
      isEnabled: true,
      subtitleStatus: "failed"
    }),
    {
      description: "websocket failed",
      status: "unavailable",
      title: "AI 번역 연결 실패"
    }
  );
});
