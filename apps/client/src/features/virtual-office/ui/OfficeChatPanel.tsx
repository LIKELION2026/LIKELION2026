import { useEffect, useRef, useState } from "react";
import type { FormEvent, JSX } from "react";
import type { LanguageCode, OfficeChatMessagePayload } from "@likelion2026/shared";
import { useTranslation } from "react-i18next";

import { createOfficeChatDisplayMessage } from "../model/office-chat-message";

interface OfficeChatPanelProps {
  isConnected: boolean;
  memberCountryCodes: Readonly<Record<string, "KR" | "VN">>;
  mentionTargetName: string | null;
  messages: OfficeChatMessagePayload[];
  onMentionConsumed: () => void;
  onSend: (text: string) => boolean;
  viewerLanguage?: LanguageCode;
}

export function OfficeChatPanel({
  isConnected,
  memberCountryCodes,
  mentionTargetName,
  messages,
  onMentionConsumed,
  onSend,
  viewerLanguage
}: OfficeChatPanelProps): JSX.Element {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mentionTargetName) {
      return;
    }

    setDraft(`@${mentionTargetName} `);
    onMentionConsumed();
  }, [mentionTargetName, onMentionConsumed]);

  useEffect(() => {
    timelineRef.current?.scrollTo({ top: timelineRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (onSend(draft)) {
      setDraft("");
    }
  };

  return (
    <section aria-label={t("officeChat.ariaLabel")} className="office-chat-panel">
      <header>
        <div>
          <p className="office-chat-eyebrow">TEAM CHAT</p>
          <h2>{t("officeChat.title")}</h2>
        </div>
        <span className={isConnected ? "office-chat-state connected" : "office-chat-state"}>
          {isConnected ? t("officeChat.connected") : t("officeChat.waiting")}
        </span>
      </header>
      <div aria-live="polite" className="office-chat-timeline" ref={timelineRef}>
        {messages.length === 0 ? (
          <p className="office-chat-empty">{t("officeChat.empty")}</p>
        ) : (
          messages.map((message) => {
            const displayMessage = createOfficeChatDisplayMessage(
              message,
              viewerLanguage
            );

            return (
              <p key={`${message.memberId}-${message.occurredAt}`}>
                <strong>
                  <span aria-hidden="true" className="office-chat-country-flag">
                    {memberCountryCodes[message.memberId] === "VN" ? "🇻🇳" : "🇰🇷"}
                  </span>
                  {message.displayName}
                </strong>
                <span>{displayMessage.text}</span>
                {displayMessage.isTranslated && displayMessage.originalText ? (
                  <small>
                    {t("officeChat.originalTextLabel")}: {displayMessage.originalText}
                  </small>
                ) : null}
              </p>
            );
          })
        )}
      </div>
      <form onSubmit={submit}>
        <input
          aria-label={t("officeChat.inputAriaLabel")}
          disabled={!isConnected}
          maxLength={160}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t("officeChat.inputPlaceholder")}
          value={draft}
        />
        <button disabled={!isConnected || !draft.trim()} type="submit">
          {t("officeChat.send")}
        </button>
      </form>
    </section>
  );
}
