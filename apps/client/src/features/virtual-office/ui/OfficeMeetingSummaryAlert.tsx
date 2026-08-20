import { useEffect } from "react";
import type { JSX } from "react";
import { CalendarCheck, X } from "lucide-react";
import { useTranslation } from "react-i18next";

const AUTO_DISMISS_MS = 6_000;

interface OfficeMeetingSummaryAlertProps {
  isVisible: boolean;
  onClose: () => void;
  onOpenCalendar: () => void;
}

export function OfficeMeetingSummaryAlert({
  isVisible,
  onClose,
  onOpenCalendar
}: OfficeMeetingSummaryAlertProps): JSX.Element | null {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const timer = window.setTimeout(onClose, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [isVisible, onClose]);

  if (!isVisible) {
    return null;
  }

  return (
    <div aria-live="polite" className="office-meeting-summary-alert" role="status">
      <button
        aria-label={t("officeMeetingSummaryAlert.open")}
        className="office-meeting-summary-alert-body"
        onClick={onOpenCalendar}
        type="button"
      >
        <span aria-hidden="true" className="office-meeting-summary-alert-icon">
          <CalendarCheck size={20} strokeWidth={2.4} />
        </span>
        <span className="office-meeting-summary-alert-text">
          <strong>{t("officeMeetingSummaryAlert.title")}</strong>
          <small>{t("officeMeetingSummaryAlert.description")}</small>
        </span>
      </button>
      <button
        aria-label={t("officeMeetingSummaryAlert.close")}
        className="office-meeting-summary-alert-close"
        onClick={onClose}
        type="button"
      >
        <X aria-hidden="true" size={16} strokeWidth={2.6} />
      </button>
    </div>
  );
}
