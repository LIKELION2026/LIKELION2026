import assert from "node:assert/strict";
import test from "node:test";
import type { OfficeChatMessagePayload } from "@likelion2026/shared";

import { createOfficeChatDisplayMessage } from "../src/features/virtual-office/model/office-chat-message.ts";

const BASE_MESSAGE: OfficeChatMessagePayload = {
  displayName: "Linh",
  memberId: "member-linh",
  occurredAt: "2026-08-20T09:00:00.000Z",
  sourceLanguage: "vi",
  teamId: "workspace-1",
  text: "Xin chào",
  translations: {
    ko: "안녕하세요"
  }
};

test("shows Vietnamese office chat as Korean for Korean-language viewers", () => {
  assert.deepEqual(createOfficeChatDisplayMessage(BASE_MESSAGE, "ko"), {
    isTranslated: true,
    originalText: "Xin chào",
    text: "안녕하세요"
  });
});

test("shows Korean office chat as Vietnamese for Vietnamese-language viewers", () => {
  const message: OfficeChatMessagePayload = {
    ...BASE_MESSAGE,
    displayName: "민지",
    sourceLanguage: "ko",
    text: "회의 시작할까요?",
    translations: {
      vi: "Bắt đầu cuộc họp nhé?"
    }
  };

  assert.deepEqual(createOfficeChatDisplayMessage(message, "vi"), {
    isTranslated: true,
    originalText: "회의 시작할까요?",
    text: "Bắt đầu cuộc họp nhé?"
  });
});

test("keeps same-language office chat as the original message", () => {
  assert.deepEqual(createOfficeChatDisplayMessage(BASE_MESSAGE, "vi"), {
    isTranslated: false,
    text: "Xin chào"
  });
});

test("falls back to the original message when a translation is unavailable", () => {
  const message: OfficeChatMessagePayload = {
    ...BASE_MESSAGE,
    translations: undefined
  };

  assert.deepEqual(createOfficeChatDisplayMessage(message, "ko"), {
    isTranslated: false,
    text: "Xin chào"
  });
});
