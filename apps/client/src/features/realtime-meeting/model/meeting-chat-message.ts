import type {
  LanguageCode,
  SubtitleCreatedPayload
} from "@likelion2026/shared";

export const MEETING_CHAT_TOPIC = "meeting.chat";
export const MEETING_CHAT_CLIENT_MESSAGE_ID_ATTRIBUTE = "clientMessageId";
export const MEETING_CHAT_MAX_TEXT_LENGTH = 500;
export const MEETING_CHAT_HISTORY_LIMIT = 5_000;

export type MeetingChatDeliveryStatus = "sending" | "sent" | "failed";
export type MeetingChatMessageKind = "user" | "translation";
export type MeetingChatTranslationStatus = "partial" | "final";

export interface MeetingChatMessage {
  clientMessageId?: string;
  deliveryStatus: MeetingChatDeliveryStatus;
  errorMessage?: string;
  id: string;
  isLocal: boolean;
  kind: MeetingChatMessageKind;
  occurredAt: string;
  roomName: string;
  senderIdentity: string;
  senderName: string;
  sourceLanguage?: LanguageCode;
  sourceText?: string;
  text: string;
  translatedLanguage?: LanguageCode;
  translationStatus?: MeetingChatTranslationStatus;
}

export type MeetingChatValidationResult =
  | {
      ok: true;
      text: string;
    }
  | {
      message: string;
      ok: false;
      reason: "empty" | "too-long";
    };

export interface CreateUserMeetingChatMessageOptions {
  clientMessageId?: string;
  deliveryStatus: MeetingChatDeliveryStatus;
  errorMessage?: string;
  id: string;
  localParticipantIdentity?: string;
  occurredAt: string;
  roomName: string;
  senderIdentity: string;
  senderName: string;
  text: string;
}

export function validateMeetingChatText(
  value: string
): MeetingChatValidationResult {
  const text = value.trim();

  if (!text) {
    return {
      message: "메시지를 입력해 주세요.",
      ok: false,
      reason: "empty"
    };
  }

  if (text.length > MEETING_CHAT_MAX_TEXT_LENGTH) {
    return {
      message: `채팅은 ${MEETING_CHAT_MAX_TEXT_LENGTH}자까지 보낼 수 있습니다.`,
      ok: false,
      reason: "too-long"
    };
  }

  return {
    ok: true,
    text
  };
}

export function createMeetingChatClientMessageId(): string {
  const randomId =
    globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

  return `meeting-chat-${randomId}`;
}

export function createUserMeetingChatMessage({
  clientMessageId,
  deliveryStatus,
  errorMessage,
  id,
  localParticipantIdentity,
  occurredAt,
  roomName,
  senderIdentity,
  senderName,
  text
}: CreateUserMeetingChatMessageOptions): MeetingChatMessage {
  return {
    clientMessageId,
    deliveryStatus,
    errorMessage,
    id,
    isLocal: senderIdentity === localParticipantIdentity,
    kind: "user",
    occurredAt,
    roomName,
    senderIdentity,
    senderName,
    text
  };
}

export function createTranslationMeetingChatMessages(
  subtitles: SubtitleCreatedPayload[],
  localParticipantIdentity: string | undefined,
  limit = MEETING_CHAT_HISTORY_LIMIT
): MeetingChatMessage[] {
  const messages = subtitles
    .map((subtitle) =>
      createTranslationMeetingChatMessage(subtitle, localParticipantIdentity)
    )
    .filter((message): message is MeetingChatMessage => Boolean(message))
    .sort(compareMeetingChatMessages);

  return limitMeetingChatMessages(messages, limit);
}

export function mergeMeetingChatMessages(
  currentMessages: MeetingChatMessage[],
  incomingMessages: MeetingChatMessage[],
  limit = MEETING_CHAT_HISTORY_LIMIT
): MeetingChatMessage[] {
  const mergedMessages = [...currentMessages];

  incomingMessages.forEach((incomingMessage) => {
    const existingIndex = mergedMessages.findIndex((message) =>
      isSameMeetingChatMessage(message, incomingMessage)
    );

    if (existingIndex === -1) {
      mergedMessages.push(incomingMessage);
      return;
    }

    mergedMessages[existingIndex] = mergeMeetingChatMessage(
      mergedMessages[existingIndex]!,
      incomingMessage
    );
  });

  return limitMeetingChatMessages(
    mergedMessages.sort(compareMeetingChatMessages),
    limit
  );
}

export function mergeMeetingChatTimeline(
  userMessages: MeetingChatMessage[],
  translationMessages: MeetingChatMessage[],
  limit = MEETING_CHAT_HISTORY_LIMIT
): MeetingChatMessage[] {
  return mergeMeetingChatMessages(userMessages, translationMessages, limit);
}

export function markMeetingChatMessageSent(
  messages: MeetingChatMessage[],
  optimisticMessageId: string,
  sentMessage: MeetingChatMessage,
  limit = MEETING_CHAT_HISTORY_LIMIT
): MeetingChatMessage[] {
  const nextMessages = messages.map((message) =>
    message.id === optimisticMessageId ||
    isSameMeetingChatMessage(message, sentMessage)
      ? mergeMeetingChatMessage(message, sentMessage)
      : message
  );

  if (!nextMessages.some((message) => isSameMeetingChatMessage(message, sentMessage))) {
    nextMessages.push(sentMessage);
  }

  return limitMeetingChatMessages(
    nextMessages.sort(compareMeetingChatMessages),
    limit
  );
}

export function markMeetingChatMessageFailed(
  messages: MeetingChatMessage[],
  messageId: string,
  errorMessage: string
): MeetingChatMessage[] {
  return messages.map((message) =>
    message.id === messageId
      ? {
          ...message,
          deliveryStatus: "failed",
          errorMessage
        }
      : message
  );
}

export function removeMeetingChatMessage(
  messages: MeetingChatMessage[],
  messageId: string
): MeetingChatMessage[] {
  return messages.filter((message) => message.id !== messageId);
}

function createTranslationMeetingChatMessage(
  subtitle: SubtitleCreatedPayload,
  localParticipantIdentity: string | undefined
): MeetingChatMessage | null {
  const translatedText = subtitle.translatedText.trim();
  const sourceText = subtitle.sourceText.trim();

  if (!translatedText && !sourceText) {
    return null;
  }

  return {
    deliveryStatus: "sent",
    id: `translation:${subtitle.subtitleId}`,
    isLocal: subtitle.speaker.participantIdentity === localParticipantIdentity,
    kind: "translation",
    occurredAt: subtitle.occurredAt,
    roomName: subtitle.roomName,
    senderIdentity: subtitle.speaker.participantIdentity,
    senderName: subtitle.speaker.displayName,
    sourceLanguage: subtitle.sourceLanguage,
    sourceText,
    text: translatedText || sourceText,
    translatedLanguage: subtitle.translatedLanguage,
    translationStatus: subtitle.isFinal ? "final" : "partial"
  };
}

function mergeMeetingChatMessage(
  currentMessage: MeetingChatMessage,
  incomingMessage: MeetingChatMessage
): MeetingChatMessage {
  const deliveryStatus =
    getDeliveryStatusPriority(incomingMessage.deliveryStatus) >=
    getDeliveryStatusPriority(currentMessage.deliveryStatus)
      ? incomingMessage.deliveryStatus
      : currentMessage.deliveryStatus;

  return {
    ...currentMessage,
    ...incomingMessage,
    deliveryStatus,
    errorMessage:
      deliveryStatus === "failed"
        ? incomingMessage.errorMessage ?? currentMessage.errorMessage
        : undefined
  };
}

function isSameMeetingChatMessage(
  left: MeetingChatMessage,
  right: MeetingChatMessage
): boolean {
  return (
    left.id === right.id ||
    Boolean(
      left.clientMessageId &&
        right.clientMessageId &&
        left.clientMessageId === right.clientMessageId
    )
  );
}

function compareMeetingChatMessages(
  left: MeetingChatMessage,
  right: MeetingChatMessage
): number {
  const occurredAtDifference =
    toTimestamp(left.occurredAt) - toTimestamp(right.occurredAt);

  if (occurredAtDifference !== 0) {
    return occurredAtDifference;
  }

  return left.id.localeCompare(right.id);
}

function getDeliveryStatusPriority(status: MeetingChatDeliveryStatus): number {
  if (status === "sent") {
    return 3;
  }

  if (status === "failed") {
    return 2;
  }

  return 1;
}

function limitMeetingChatMessages(
  messages: MeetingChatMessage[],
  limit: number
): MeetingChatMessage[] {
  if (messages.length <= limit) {
    return messages;
  }

  return messages.slice(messages.length - limit);
}

function toTimestamp(value: string): number {
  const timestamp = Date.parse(value);

  return Number.isNaN(timestamp) ? 0 : timestamp;
}
