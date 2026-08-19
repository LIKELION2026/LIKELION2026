import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
  type JSX
} from "react";

import {
  MEETING_CHAT_MAX_TEXT_LENGTH,
  type MeetingChatMessage
} from "../model/meeting-chat-message";
import type {
  MeetingChatSendResult,
  MeetingChatStatus
} from "../model/use-meeting-chat";

interface MeetingChatPanelProps {
  errorMessage?: string;
  messages: MeetingChatMessage[];
  onDeleteMessage: (messageId: string) => void;
  onRetryMessage: (messageId: string) => Promise<MeetingChatSendResult>;
  onSendMessage: (text: string) => Promise<MeetingChatSendResult>;
  status: MeetingChatStatus;
}

const CHAT_STATUS_LABELS: Record<MeetingChatStatus, string> = {
  idle: "회의 연결 대기",
  ready: "실시간 채팅 가능",
  reconnecting: "재연결 중",
  unavailable: "채팅 일시 중지"
};

export function MeetingChatPanel({
  errorMessage,
  messages,
  onDeleteMessage,
  onRetryMessage,
  onSendMessage,
  status
}: MeetingChatPanelProps): JSX.Element {
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const isAtBottomRef = useRef(true);
  const listRef = useRef<HTMLDivElement>(null);
  const previousMessageCountRef = useRef(messages.length);
  const canSend = status === "ready" && !isSubmitting;

  useEffect(() => {
    const previousMessageCount = previousMessageCountRef.current;
    const didReceiveNewMessage = messages.length > previousMessageCount;
    previousMessageCountRef.current = messages.length;

    if (!didReceiveNewMessage) {
      return;
    }

    const newMessageCount = messages.length - previousMessageCount;

    if (isAtBottomRef.current) {
      scrollToLatestMessage();
      return;
    }

    setUnreadCount((currentCount) => currentCount + newMessageCount);
  }, [messages.length]);

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSend) {
      setDraftError(getStatusHelpText(status));
      return;
    }

    setIsSubmitting(true);
    setDraftError(undefined);
    const result = await onSendMessage(draft);
    setIsSubmitting(false);

    if (!result.ok) {
      setDraftError(result.message);
      return;
    }

    setDraft("");
  };

  return (
    <section aria-label="회의 채팅" className="meeting-chat-panel">
      <header className="meeting-chat-header">
        <strong>채팅</strong>
      </header>
      <div className={`meeting-chat-status ${status}`}>
        <span>{CHAT_STATUS_LABELS[status]}</span>
        <small>{getStatusHelpText(status)}</small>
      </div>
      {errorMessage ? (
        <p className="meeting-chat-error">{errorMessage}</p>
      ) : null}
      <div
        aria-live="polite"
        className="meeting-chat-list"
        onScroll={handleMessageListScroll}
        ref={listRef}
      >
        {messages.length > 0 ? (
          messages.map((message) => (
            <MeetingChatBubble
              key={message.id}
              message={message}
              onDeleteMessage={onDeleteMessage}
              onRetryMessage={onRetryMessage}
            />
          ))
        ) : (
          <div className="meeting-chat-empty">
            {status === "ready"
              ? "아직 채팅이 없습니다. 첫 메시지를 보내보세요."
              : "회의 연결이 완료되면 채팅이 열립니다."}
          </div>
        )}
      </div>
      {unreadCount > 0 ? (
        <button
          className="meeting-chat-new-message-button"
          onClick={() => {
            setUnreadCount(0);
            scrollToLatestMessage();
          }}
          type="button"
        >
          새 메시지 {unreadCount}개 보기
        </button>
      ) : null}
      <form className="meeting-chat-form" onSubmit={submitMessage}>
        <textarea
          aria-label="채팅 메시지"
          disabled={status !== "ready"}
          maxLength={MEETING_CHAT_MAX_TEXT_LENGTH}
          onChange={(event) => {
            setDraft(event.target.value);
            setDraftError(undefined);
          }}
          onKeyDown={handleDraftKeyDown}
          placeholder="회의 참가자에게 메시지 보내기"
          rows={2}
          value={draft}
        />
        <div className="meeting-chat-form-footer">
          <span>
            {draft.trim().length}/{MEETING_CHAT_MAX_TEXT_LENGTH}
          </span>
          <button disabled={!canSend || !draft.trim()} type="submit">
            {isSubmitting ? "전송 중" : "전송"}
          </button>
        </div>
      </form>
      {draftError ? (
        <p className="meeting-chat-error">{draftError}</p>
      ) : null}
    </section>
  );

  function handleMessageListScroll() {
    const listElement = listRef.current;
    if (!listElement) {
      return;
    }

    const distanceFromBottom =
      listElement.scrollHeight -
      listElement.scrollTop -
      listElement.clientHeight;

    isAtBottomRef.current = distanceFromBottom < 32;
    if (isAtBottomRef.current) {
      setUnreadCount(0);
    }
  }

  function scrollToLatestMessage() {
    window.requestAnimationFrame(() => {
      const listElement = listRef.current;
      if (!listElement) {
        return;
      }

      listElement.scrollTop = listElement.scrollHeight;
      isAtBottomRef.current = true;
      setUnreadCount(0);
    });
  }

  function handleDraftKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    event.stopPropagation();

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }
}

interface MeetingChatBubbleProps {
  message: MeetingChatMessage;
  onDeleteMessage: (messageId: string) => void;
  onRetryMessage: (messageId: string) => Promise<MeetingChatSendResult>;
}

function MeetingChatBubble({
  message,
  onDeleteMessage,
  onRetryMessage
}: MeetingChatBubbleProps): JSX.Element {
  const ownerLabel = message.isLocal ? "나" : message.senderName;

  return (
    <article
      className={[
        "meeting-chat-message",
        message.isLocal ? "local" : "remote",
        message.kind,
        message.deliveryStatus
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header>
        <strong>{ownerLabel}</strong>
        {message.kind === "translation" ? (
          <span className="meeting-chat-kind">AI 번역</span>
        ) : null}
        {message.translationStatus === "partial" ? (
          <span className="meeting-chat-kind pending">번역 중</span>
        ) : null}
        <time dateTime={message.occurredAt}>
          {formatMeetingChatTime(message.occurredAt)}
        </time>
      </header>
      <p>{message.text}</p>
      {message.kind === "translation" && message.sourceText ? (
        <p className="meeting-chat-source">
          {message.sourceLanguage}
          {" → "}
          {message.translatedLanguage}
          {" · "}
          {message.sourceText}
        </p>
      ) : null}
      {message.deliveryStatus !== "sent" ? (
        <footer>
          <span>
            {message.deliveryStatus === "sending"
              ? "전송 중"
              : message.errorMessage ?? "전송 실패"}
          </span>
          {message.deliveryStatus === "failed" ? (
            <div>
              <button
                onClick={() => {
                  void onRetryMessage(message.id);
                }}
                type="button"
              >
                재시도
              </button>
              <button
                onClick={() => onDeleteMessage(message.id)}
                type="button"
              >
                삭제
              </button>
            </div>
          ) : null}
        </footer>
      ) : null}
    </article>
  );
}

function getStatusHelpText(status: MeetingChatStatus): string {
  if (status === "ready") {
    return "같은 회의방에 연결된 참가자에게만 전달됩니다.";
  }

  if (status === "reconnecting") {
    return "재연결 중에는 새 메시지 전송을 잠시 멈춥니다.";
  }

  return "회의 연결이 완료되면 메시지를 보낼 수 있습니다.";
}

function formatMeetingChatTime(occurredAt: string): string {
  const date = new Date(occurredAt);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}
