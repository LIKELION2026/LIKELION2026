import type { JSX } from "react";
import type { SubtitleCreatedPayload } from "@likelion2026/shared";
import { useTranslation } from "react-i18next";

import { formatDateTime, type UiLocale, useUiLocale } from "../../../shared/i18n";
import type { MeetingSubtitleStatus } from "../model/use-meeting-subtitles";

interface MeetingSubtitlePanelProps {
  errorMessage?: string;
  status: MeetingSubtitleStatus;
  subtitles: SubtitleCreatedPayload[];
}

export function MeetingSubtitlePanel({
  errorMessage,
  status,
  subtitles
}: MeetingSubtitlePanelProps): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = useUiLocale();

  if (status === "idle" && subtitles.length === 0) {
    return null;
  }

  return (
    <section className="meeting-subtitle-panel" aria-live="polite">
      <div className="meeting-subtitle-panel-header">
        <div>
          <span>{t("meetingSubtitles.subtitleMock")}</span>
          <strong>{t("meetingSubtitles.title")}</strong>
        </div>
        <span className={`meeting-subtitle-state ${status}`}>
          {t(`meetingSubtitles.status.${status}`)}
        </span>
      </div>
      {errorMessage ? (
        <p className="meeting-subtitle-error">{translateMaybeKey(t, errorMessage)}</p>
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
                  {formatSubtitleTime(subtitle.occurredAt, locale)}
                </time>
                <span className="meeting-subtitle-finality">
                  {subtitle.isFinal ? t("meetingSubtitles.final") : t("meetingSubtitles.partial")}
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
          {t("meetingSubtitles.empty")}
        </div>
      )}
    </section>
  );
}

function formatSubtitleTime(occurredAt: string, locale: UiLocale): string {
  const date = new Date(occurredAt);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return formatDateTime(date, locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function translateMaybeKey(
  t: (key: string) => string,
  value: string
): string {
  return /^[a-z][\w-]*(?:\.[\w-]+)+$/.test(value) ? t(value) : value;
}
