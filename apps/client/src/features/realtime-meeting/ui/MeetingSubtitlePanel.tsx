import type { JSX } from "react";
import type { SubtitleCreatedPayload } from "@likelion2026/shared";

import type { MeetingSubtitleStatus } from "../model/use-meeting-subtitles";

interface MeetingSubtitlePanelProps {
  errorMessage?: string;
  status: MeetingSubtitleStatus;
  subtitles: SubtitleCreatedPayload[];
}

const SUBTITLE_STATUS_LABELS: Record<MeetingSubtitleStatus, string> = {
  disconnected: "연결 종료",
  failed: "오류",
  idle: "대기",
  loading: "연결 중",
  subscribed: "수신 중"
};

export function MeetingSubtitlePanel({
  errorMessage,
  status,
  subtitles
}: MeetingSubtitlePanelProps): JSX.Element | null {
  if (status === "idle" && subtitles.length === 0) {
    return null;
  }

  return (
    <section className="meeting-subtitle-panel" aria-live="polite">
      <div className="meeting-subtitle-panel-header">
        <div>
          <span>Subtitle Mock</span>
          <strong>실시간 자막</strong>
        </div>
        <span className={`meeting-subtitle-state ${status}`}>
          {SUBTITLE_STATUS_LABELS[status]}
        </span>
      </div>
      {errorMessage ? (
        <p className="meeting-subtitle-error">{errorMessage}</p>
      ) : null}
      {subtitles.length > 0 ? (
        <div className="meeting-subtitle-list">
          {subtitles.map((subtitle) => (
            <article
              className={`meeting-subtitle-item ${
                subtitle.isFinal ? "final" : "partial"
              }`}
              key={subtitle.subtitleId}
            >
              <header>
                <strong>{subtitle.speaker.displayName}</strong>
                <span>
                  {subtitle.sourceLanguage}
                  {" -> "}
                  {subtitle.translatedLanguage}
                </span>
                <time dateTime={subtitle.occurredAt}>
                  {formatSubtitleTime(subtitle.occurredAt)}
                </time>
                <span className="meeting-subtitle-finality">
                  {subtitle.isFinal ? "확정" : "임시"}
                </span>
              </header>
              <p className="meeting-subtitle-source">{subtitle.sourceText}</p>
              <p className="meeting-subtitle-translation">
                {subtitle.translatedText}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <div className="meeting-subtitle-empty">
          아직 표시할 자막이 없습니다.
        </div>
      )}
    </section>
  );
}

function formatSubtitleTime(occurredAt: string): string {
  const date = new Date(occurredAt);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}
