import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SubtitleCreatedPayload } from "@likelion2026/shared";
import type { Room } from "livekit-client";

import {
  MEETING_CHAT_CLIENT_MESSAGE_ID_ATTRIBUTE,
  MEETING_CHAT_HISTORY_LIMIT,
  MEETING_CHAT_TOPIC,
  createMeetingChatClientMessageId,
  createTranslationMeetingChatMessages,
  createUserMeetingChatMessage,
  markMeetingChatMessageFailed,
  markMeetingChatMessageSent,
  mergeMeetingChatMessages,
  mergeMeetingChatTimeline,
  removeMeetingChatMessage,
  validateMeetingChatText,
  type MeetingChatMessage,
  type MeetingChatValidationResult
} from "./meeting-chat-message";
import type {
  LiveKitMeetingParticipant,
  LiveKitMeetingSessionStatus
} from "./use-livekit-meeting-session";

export type MeetingChatStatus =
  | "idle"
  | "ready"
  | "reconnecting"
  | "unavailable";
type MeetingChatValidationFailureReason = Extract<
  MeetingChatValidationResult,
  { ok: false }
>["reason"];

export type MeetingChatSendResult =
  | {
      ok: true;
    }
  | {
      message: string;
      ok: false;
      reason?: MeetingChatValidationFailureReason;
    };

export interface MeetingChatState {
  deleteMessage: (messageId: string) => void;
  errorMessage?: string;
  messages: MeetingChatMessage[];
  retryMessage: (messageId: string) => Promise<MeetingChatSendResult>;
  sendMessage: (text: string) => Promise<MeetingChatSendResult>;
  status: MeetingChatStatus;
  userMessageCount: number;
}

interface UseMeetingChatOptions {
  localParticipantIdentity?: string;
  participants: LiveKitMeetingParticipant[];
  room: Room | null;
  roomName?: string;
  sessionStatus: LiveKitMeetingSessionStatus;
  translationSubtitles?: SubtitleCreatedPayload[];
}

type TextStreamHandler = Parameters<Room["registerTextStreamHandler"]>[1];

export function useMeetingChat({
  localParticipantIdentity,
  participants,
  room,
  roomName,
  sessionStatus,
  translationSubtitles = []
}: UseMeetingChatOptions): MeetingChatState {
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [userMessages, setUserMessages] = useState<MeetingChatMessage[]>([]);
  const participantNameByIdentityRef = useRef<Map<string, string>>(new Map());
  const userMessagesRef = useRef<MeetingChatMessage[]>(userMessages);
  const localParticipantIdentityRef = useRef(localParticipantIdentity);
  const roomNameRef = useRef(roomName);

  const status = getMeetingChatStatus(sessionStatus, room, roomName);

  const participantNameByIdentity = useMemo(() => {
    return new Map(
      participants.map((participant) => [
        participant.identity,
        participant.participantName
      ])
    );
  }, [participants]);

  useEffect(() => {
    participantNameByIdentityRef.current = participantNameByIdentity;
  }, [participantNameByIdentity]);

  useEffect(() => {
    userMessagesRef.current = userMessages;
  }, [userMessages]);

  useEffect(() => {
    localParticipantIdentityRef.current = localParticipantIdentity;
  }, [localParticipantIdentity]);

  useEffect(() => {
    roomNameRef.current = roomName;
    setErrorMessage(undefined);
    setUserMessages([]);
  }, [roomName]);

  useEffect(() => {
    if (!room || !roomName) {
      return;
    }

    let isDisposed = false;
    const handleTextStream: TextStreamHandler = (reader, participantInfo) => {
      void readIncomingTextStream(reader, participantInfo.identity).catch(
        (error: unknown) => {
          if (isDisposed) {
            return;
          }

          setErrorMessage(getMeetingChatErrorMessage(error));
        }
      );
    };

    const readIncomingTextStream = async (
      reader: Parameters<TextStreamHandler>[0],
      senderIdentity: string
    ) => {
      const text = await reader.readAll();

      if (isDisposed || roomNameRef.current !== roomName) {
        return;
      }

      const validation = validateMeetingChatText(text);
      if (!validation.ok) {
        return;
      }

      const senderName =
        participantNameByIdentityRef.current.get(senderIdentity) ??
        senderIdentity;
      const incomingMessage = createUserMeetingChatMessage({
        clientMessageId:
          reader.info.attributes?.[MEETING_CHAT_CLIENT_MESSAGE_ID_ATTRIBUTE],
        deliveryStatus: "sent",
        id: reader.info.id,
        localParticipantIdentity: localParticipantIdentityRef.current,
        occurredAt: createOccurredAtFromTimestamp(reader.info.timestamp),
        roomName,
        senderIdentity,
        senderName,
        text: validation.text
      });

      setUserMessages((currentMessages) =>
        mergeMeetingChatMessages(currentMessages, [incomingMessage])
      );
    };

    room.registerTextStreamHandler(MEETING_CHAT_TOPIC, handleTextStream);

    return () => {
      isDisposed = true;
      room.unregisterTextStreamHandler(MEETING_CHAT_TOPIC);
    };
  }, [room, roomName]);

  const publishMessage = useCallback(
    async (
      message: MeetingChatMessage,
      optimisticMessageId: string
    ): Promise<MeetingChatSendResult> => {
      if (
        !room ||
        !roomName ||
        !localParticipantIdentity ||
        sessionStatus !== "connected"
      ) {
        const messageText = getUnavailableMessage(sessionStatus);
        setUserMessages((currentMessages) =>
          markMeetingChatMessageFailed(
            currentMessages,
            optimisticMessageId,
            messageText
          )
        );
        setErrorMessage(messageText);

        return {
          message: messageText,
          ok: false
        };
      }

      try {
        setErrorMessage(undefined);
        const streamInfo = await room.localParticipant.sendText(message.text, {
          attributes: {
            [MEETING_CHAT_CLIENT_MESSAGE_ID_ATTRIBUTE]:
              message.clientMessageId ?? optimisticMessageId
          },
          topic: MEETING_CHAT_TOPIC
        });
        const sentMessage = createUserMeetingChatMessage({
          clientMessageId: message.clientMessageId,
          deliveryStatus: "sent",
          id: streamInfo.id,
          localParticipantIdentity,
          occurredAt: createOccurredAtFromTimestamp(streamInfo.timestamp),
          roomName,
          senderIdentity: localParticipantIdentity,
          senderName: getParticipantName(localParticipantIdentity),
          text: message.text
        });

        setUserMessages((currentMessages) =>
          markMeetingChatMessageSent(
            currentMessages,
            optimisticMessageId,
            sentMessage
          )
        );

        return {
          ok: true
        };
      } catch (error) {
        const messageText = getMeetingChatErrorMessage(error);
        setUserMessages((currentMessages) =>
          markMeetingChatMessageFailed(
            currentMessages,
            optimisticMessageId,
            messageText
          )
        );
        setErrorMessage(messageText);

        return {
          message: messageText,
          ok: false
        };
      }
    },
    [localParticipantIdentity, room, roomName, sessionStatus]
  );

  const sendMessage = useCallback(
    async (text: string): Promise<MeetingChatSendResult> => {
      const validation = validateMeetingChatText(text);

      if (!validation.ok) {
        return {
          message: validation.message,
          ok: false,
          reason: validation.reason
        };
      }

      const clientMessageId = createMeetingChatClientMessageId();
      const optimisticMessage = createUserMeetingChatMessage({
        clientMessageId,
        deliveryStatus: "sending",
        id: clientMessageId,
        localParticipantIdentity,
        occurredAt: new Date().toISOString(),
        roomName: roomName ?? "",
        senderIdentity: localParticipantIdentity ?? "local",
        senderName: localParticipantIdentity
          ? getParticipantName(localParticipantIdentity)
          : "나",
        text: validation.text
      });

      setUserMessages((currentMessages) =>
        mergeMeetingChatMessages(currentMessages, [optimisticMessage])
      );

      return publishMessage(optimisticMessage, optimisticMessage.id);
    },
    [localParticipantIdentity, publishMessage, roomName]
  );

  const retryMessage = useCallback(
    async (messageId: string): Promise<MeetingChatSendResult> => {
      const failedMessage = userMessagesRef.current.find(
        (message) => message.id === messageId && message.deliveryStatus === "failed"
      );

      if (!failedMessage) {
        return {
          message: "재시도할 메시지를 찾지 못했습니다.",
          ok: false
        };
      }

      const retryMessage = {
        ...failedMessage,
        deliveryStatus: "sending" as const,
        errorMessage: undefined
      };

      setUserMessages((currentMessages) =>
        mergeMeetingChatMessages(currentMessages, [retryMessage])
      );

      return publishMessage(retryMessage, failedMessage.id);
    },
    [publishMessage]
  );

  const deleteMessage = useCallback((messageId: string) => {
    setUserMessages((currentMessages) =>
      removeMeetingChatMessage(currentMessages, messageId)
    );
  }, []);

  const translationMessages = useMemo(
    () =>
      createTranslationMeetingChatMessages(
        translationSubtitles,
        localParticipantIdentity,
        MEETING_CHAT_HISTORY_LIMIT
      ),
    [localParticipantIdentity, translationSubtitles]
  );
  const messages = useMemo(
    () =>
      mergeMeetingChatTimeline(
        userMessages,
        translationMessages,
        MEETING_CHAT_HISTORY_LIMIT
      ),
    [translationMessages, userMessages]
  );

  return {
    deleteMessage,
    errorMessage,
    messages,
    retryMessage,
    sendMessage,
    status,
    userMessageCount: userMessages.length
  };

  function getParticipantName(participantIdentity: string): string {
    return (
      participantNameByIdentityRef.current.get(participantIdentity) ??
      participantIdentity
    );
  }
}

function getMeetingChatStatus(
  sessionStatus: LiveKitMeetingSessionStatus,
  room: Room | null,
  roomName: string | undefined
): MeetingChatStatus {
  if (!room || !roomName) {
    return "idle";
  }

  if (sessionStatus === "connected") {
    return "ready";
  }

  if (sessionStatus === "reconnecting") {
    return "reconnecting";
  }

  return "unavailable";
}

function getUnavailableMessage(
  sessionStatus: LiveKitMeetingSessionStatus
): string {
  if (sessionStatus === "reconnecting") {
    return "재연결 중에는 채팅 전송을 잠시 멈춥니다.";
  }

  return "회의 연결이 완료된 뒤 채팅을 보낼 수 있습니다.";
}

function createOccurredAtFromTimestamp(timestamp: number | undefined): string {
  const occurredAt = new Date(timestamp ?? Date.now());

  if (Number.isNaN(occurredAt.getTime())) {
    return new Date().toISOString();
  }

  return occurredAt.toISOString();
}

function getMeetingChatErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "채팅 메시지를 처리하지 못했습니다.";
}
