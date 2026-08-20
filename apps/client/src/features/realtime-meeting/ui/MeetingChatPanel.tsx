import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
  type JSX
} from "react";
import { useTranslation } from "react-i18next";

import { formatDateTime, type UiLocale, useUiLocale } from "../../../shared/i18n";
import {
  MEETING_CHAT_MAX_TEXT_LENGTH,
  type MeetingChatMessage
} from "../model/meeting-chat-message";
import { shouldSubmitMeetingChatDraftKey } from "../model/meeting-chat-input";
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

export function MeetingChatPanel({
  errorMessage,
  messages,
  onDeleteMessage,
  onRetryMessage,
  onSendMessage,
  status
}: MeetingChatPanelProps): JSX.Element {
  const { t } = useTranslation();
  const { locale } = useUiLocale();
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const draftInputRef = useRef<HTMLTextAreaElement>(null);
  const isDraftComposingRef = useRef(false);
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
      setDraftError(getStatusHelpTextKey(status));
      return;
    }

    setIsSubmitting(true);
    setDraftError(undefined);
    const result = await onSendMessage(draftInputRef.current?.value ?? draft);
    setIsSubmitting(false);

    if (!result.ok) {
      setDraftError(result.message);
      return;
    }

    setDraft("");
  };

  return (
    <section aria-label={t("meetingChat.ariaLabel")} className="meeting-chat-panel">
      <header className="meeting-chat-header">
        <strong>{t("meetingChat.title")}</strong>
      </header>
      <div className={`meeting-chat-status ${status}`}>
        <span>{t(`meetingChat.status.${status}`)}</span>
        <small>{t(getStatusHelpTextKey(status))}</small>
      </div>
      {errorMessage ? (
        <p className="meeting-chat-error">{translateMaybeKey(t, errorMessage)}</p>
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
              translateMaybeKey={(value) => translateMaybeKey(t, value)}
              uiLocale={locale}
            />
          ))
        ) : (
          <div className="meeting-chat-empty">
            {status === "ready"
              ? t("meetingChat.emptyReady")
              : t("meetingChat.emptyWaiting")}
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
          {t("meetingChat.newMessages", { count: unreadCount })}
        </button>
      ) : null}
      <form className="meeting-chat-form" onSubmit={submitMessage}>
        <textarea
          aria-label={t("meetingChat.inputAriaLabel")}
          disabled={status !== "ready"}
          maxLength={MEETING_CHAT_MAX_TEXT_LENGTH}
          onChange={(event) => {
            setDraft(event.target.value);
            setDraftError(undefined);
          }}
          onCompositionEnd={(event) => {
            isDraftComposingRef.current = false;
            setDraft(event.currentTarget.value);
          }}
          onCompositionStart={() => {
            isDraftComposingRef.current = true;
          }}
          onKeyDown={handleDraftKeyDown}
          placeholder={t("meetingChat.inputPlaceholder")}
          ref={draftInputRef}
          rows={2}
          value={draft}
        />
        <div className="meeting-chat-form-footer">
          <span>
            {draft.trim().length}/{MEETING_CHAT_MAX_TEXT_LENGTH}
          </span>
          <button disabled={!canSend || !draft.trim()} type="submit">
            {isSubmitting ? t("meetingChat.sending") : t("meetingChat.send")}
          </button>
        </div>
      </form>
      {draftError ? (
        <p className="meeting-chat-error">{translateMaybeKey(t, draftError)}</p>
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

    if (
      shouldSubmitMeetingChatDraftKey({
        isComposing:
          isDraftComposingRef.current || event.nativeEvent.isComposing,
        key: event.key,
        keyCode: event.keyCode,
        shiftKey: event.shiftKey
      })
    ) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }
}

interface MeetingChatBubbleProps {
  message: MeetingChatMessage;
  onDeleteMessage: (messageId: string) => void;
  onRetryMessage: (messageId: string) => Promise<MeetingChatSendResult>;
  translateMaybeKey: (value: string) => string;
  uiLocale: UiLocale;
}

function MeetingChatBubble({
  message,
  onDeleteMessage,
  onRetryMessage,
  translateMaybeKey,
  uiLocale
}: MeetingChatBubbleProps): JSX.Element {
  const { t } = useTranslation();
  const ownerLabel = message.isLocal ? t("meetingChat.ownerLocal") : message.senderName;

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
          <span className="meeting-chat-kind">{t("meetingChat.kindTranslation")}</span>
        ) : null}
        {message.translationStatus === "partial" ? (
          <span className="meeting-chat-kind pending">{t("meetingChat.pendingTranslation")}</span>
        ) : null}
        <time dateTime={message.occurredAt}>
          {formatMeetingChatTime(message.occurredAt, uiLocale)}
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
              ? t("meetingChat.sending")
              : message.errorMessage
                ? translateMaybeKey(message.errorMessage)
                : t("meetingChat.deliveryFailed")}
          </span>
          {message.deliveryStatus === "failed" ? (
            <div>
              <button
                onClick={() => {
                  void onRetryMessage(message.id);
                }}
                type="button"
              >
                {t("meetingChat.retry")}
              </button>
              <button
                onClick={() => onDeleteMessage(message.id)}
                type="button"
              >
                {t("meetingChat.delete")}
              </button>
            </div>
          ) : null}
        </footer>
      ) : null}
    </article>
  );
}

function getStatusHelpTextKey(status: MeetingChatStatus): string {
  if (status === "ready") {
    return "meetingChat.help.ready";
  }

  if (status === "reconnecting") {
    return "meetingChat.help.reconnecting";
  }

  return `meetingChat.help.${status}`;
}

function formatMeetingChatTime(occurredAt: string, locale: UiLocale): string {
  const date = new Date(occurredAt);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return formatDateTime(date, locale, {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function translateMaybeKey(
  t: (key: string, options?: Record<string, unknown>) => string,
  value: string
): string {
  if (!/^[a-z][\w-]*(?:\.[\w-]+)+$/.test(value)) {
    return value;
  }

  return t(value, { max: MEETING_CHAT_MAX_TEXT_LENGTH });
}
