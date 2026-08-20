import assert from "node:assert/strict";
import test from "node:test";
import type { SubtitleCreatedPayload } from "@likelion2026/shared";

import {
  MEETING_CHAT_HISTORY_LIMIT,
  MEETING_CHAT_MAX_TEXT_LENGTH,
  createTranslationMeetingChatMessages,
  createUserMeetingChatMessage,
  markMeetingChatMessageSent,
  mergeMeetingChatMessages,
  mergeMeetingChatTimeline,
  validateMeetingChatText
} from "../src/features/realtime-meeting/model/meeting-chat-message.ts";

test("validates empty and over-limit meeting chat text", () => {
  assert.deepEqual(validateMeetingChatText("   "), {
    message: "메시지를 입력해 주세요.",
    ok: false,
    reason: "empty"
  });
  assert.deepEqual(validateMeetingChatText("  hello  "), {
    ok: true,
    text: "hello"
  });
  assert.deepEqual(
    validateMeetingChatText("가".repeat(MEETING_CHAT_MAX_TEXT_LENGTH + 1)),
    {
      message: `채팅은 ${MEETING_CHAT_MAX_TEXT_LENGTH}자까지 보낼 수 있습니다.`,
      ok: false,
      reason: "too-long"
    }
  );
});

test("merges optimistic local messages with LiveKit stream acknowledgements", () => {
  const pendingMessage = createUserMeetingChatMessage({
    clientMessageId: "client-1",
    deliveryStatus: "sending",
    id: "client-1",
    localParticipantIdentity: "alice",
    occurredAt: "2026-08-19T09:00:00.000Z",
    roomName: "meeting-room",
    senderIdentity: "alice",
    senderName: "Alice",
    text: "안녕하세요"
  });
  const sentMessage = createUserMeetingChatMessage({
    clientMessageId: "client-1",
    deliveryStatus: "sent",
    id: "stream-1",
    localParticipantIdentity: "alice",
    occurredAt: "2026-08-19T09:00:01.000Z",
    roomName: "meeting-room",
    senderIdentity: "alice",
    senderName: "Alice",
    text: "안녕하세요"
  });

  const messages = markMeetingChatMessageSent(
    [pendingMessage],
    pendingMessage.id,
    sentMessage
  );

  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.id, "stream-1");
  assert.equal(messages[0]?.deliveryStatus, "sent");
  assert.equal(messages[0]?.clientMessageId, "client-1");
});

test("deduplicates LiveKit local echoes by client message id", () => {
  const pendingMessage = createUserMeetingChatMessage({
    clientMessageId: "client-echo",
    deliveryStatus: "sending",
    id: "client-echo",
    localParticipantIdentity: "alice",
    occurredAt: "2026-08-19T09:00:00.000Z",
    roomName: "meeting-room",
    senderIdentity: "alice",
    senderName: "Alice",
    text: "중복되면 안 됨"
  });
  const echoMessage = createUserMeetingChatMessage({
    clientMessageId: "client-echo",
    deliveryStatus: "sent",
    id: "stream-echo",
    localParticipantIdentity: "alice",
    occurredAt: "2026-08-19T09:00:01.000Z",
    roomName: "meeting-room",
    senderIdentity: "alice",
    senderName: "Alice",
    text: "중복되면 안 됨"
  });

  const messages = mergeMeetingChatMessages([pendingMessage], [echoMessage]);

  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.id, "stream-echo");
  assert.equal(messages[0]?.deliveryStatus, "sent");
});

test("caps the rendered meeting chat history window", () => {
  const messages = Array.from(
    { length: MEETING_CHAT_HISTORY_LIMIT + 2 },
    (_, index) =>
      createUserMeetingChatMessage({
        deliveryStatus: "sent",
        id: `message-${index}`,
        localParticipantIdentity: "alice",
        occurredAt: new Date(Date.UTC(2026, 7, 19, 9, 0, index)).toISOString(),
        roomName: "meeting-room",
        senderIdentity: index % 2 === 0 ? "alice" : "bob",
        senderName: index % 2 === 0 ? "Alice" : "Bob",
        text: `message ${index}`
      })
  );

  const cappedMessages = mergeMeetingChatMessages([], messages);

  assert.equal(cappedMessages.length, MEETING_CHAT_HISTORY_LIMIT);
  assert.equal(cappedMessages[0]?.id, "message-2");
  assert.equal(
    cappedMessages[cappedMessages.length - 1]?.id,
    `message-${MEETING_CHAT_HISTORY_LIMIT + 1}`
  );
});

test("maps AI translation subtitles into labeled chat messages", () => {
  const subtitles: SubtitleCreatedPayload[] = [
    {
      isFinal: false,
      occurredAt: "2026-08-19T09:00:03.000Z",
      revision: 2,
      roomName: "meeting-room",
      sourceLanguage: "vi",
      sourceText: "Xin chào",
      speaker: {
        displayName: "Linh",
        participantIdentity: "linh"
      },
      subtitleId: "subtitle-1",
      translatedLanguage: "ko",
      translatedText: "안녕하세요"
    }
  ];

  const messages = createTranslationMeetingChatMessages(subtitles, "linh");

  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.id, "translation:subtitle-1");
  assert.equal(messages[0]?.isLocal, true);
  assert.equal(messages[0]?.kind, "translation");
  assert.equal(messages[0]?.sourceText, "Xin chào");
  assert.equal(messages[0]?.text, "안녕하세요");
  assert.equal(messages[0]?.translationStatus, "partial");
});

test("sorts user and AI translation messages in one chat timeline", () => {
  const userMessage = createUserMeetingChatMessage({
    deliveryStatus: "sent",
    id: "stream-2",
    localParticipantIdentity: "alice",
    occurredAt: "2026-08-19T09:00:02.000Z",
    roomName: "meeting-room",
    senderIdentity: "bob",
    senderName: "Bob",
    text: "회의 시작할게요"
  });
  const translationMessage = createTranslationMeetingChatMessages(
    [
      {
        isFinal: true,
        occurredAt: "2026-08-19T09:00:01.000Z",
        revision: 1,
        roomName: "meeting-room",
        sourceLanguage: "ko",
        sourceText: "안녕하세요",
        speaker: {
          displayName: "Alice",
          participantIdentity: "alice"
        },
        subtitleId: "subtitle-2",
        translatedLanguage: "vi",
        translatedText: "Xin chào"
      }
    ],
    "alice"
  );

  const timeline = mergeMeetingChatTimeline([userMessage], translationMessage);

  assert.deepEqual(
    timeline.map((message) => message.id),
    ["translation:subtitle-2", "stream-2"]
  );
});
