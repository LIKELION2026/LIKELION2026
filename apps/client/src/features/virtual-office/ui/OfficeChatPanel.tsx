import { useEffect, useRef, useState } from "react";
import type { FormEvent, JSX } from "react";
import type { OfficeChatMessagePayload } from "@likelion2026/shared";

interface OfficeChatPanelProps {
  isConnected: boolean;
  memberCountryCodes: Readonly<Record<string, "KR" | "VN">>;
  mentionTargetName: string | null;
  messages: OfficeChatMessagePayload[];
  onMentionConsumed: () => void;
  onSend: (text: string) => boolean;
}

export function OfficeChatPanel({
  isConnected,
  memberCountryCodes,
  mentionTargetName,
  messages,
  onMentionConsumed,
  onSend
}: OfficeChatPanelProps): JSX.Element {
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
    <section aria-label="오피스 공용 채팅" className="office-chat-panel">
      <header>
        <div>
          <p className="office-chat-eyebrow">TEAM CHAT</p>
          <h2>오피스 대화</h2>
        </div>
        <span className={isConnected ? "office-chat-state connected" : "office-chat-state"}>
          {isConnected ? "실시간" : "연결 대기"}
        </span>
      </header>
      <div aria-live="polite" className="office-chat-timeline" ref={timelineRef}>
        {messages.length === 0 ? (
          <p className="office-chat-empty">팀원에게 가볍게 말을 걸어 보세요.</p>
        ) : (
          messages.map((message) => (
            <p key={`${message.memberId}-${message.occurredAt}`}>
              <strong>
                <span aria-hidden="true" className="office-chat-country-flag">
                  {memberCountryCodes[message.memberId] === "VN" ? "🇻🇳" : "🇰🇷"}
                </span>
                {message.displayName}
              </strong>
              <span>{message.text}</span>
            </p>
          ))
        )}
      </div>
      <form onSubmit={submit}>
        <input
          aria-label="공용 채팅 입력"
          disabled={!isConnected}
          maxLength={160}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="팀원에게 메시지 보내기"
          value={draft}
        />
        <button disabled={!isConnected || !draft.trim()} type="submit">보내기</button>
      </form>
    </section>
  );
}
