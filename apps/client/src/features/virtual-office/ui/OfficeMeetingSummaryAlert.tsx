import { useEffect } from "react";
import type { JSX } from "react";

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
        aria-label="회의 요약 보러 가기"
        className="office-meeting-summary-alert-body"
        onClick={onOpenCalendar}
        type="button"
      >
        <span aria-hidden="true" className="office-meeting-summary-alert-icon">📅</span>
        <span className="office-meeting-summary-alert-text">
          <strong>회의 요약 도착!</strong>
          <small>공유 캘린더에서 확인해 보세요</small>
        </span>
      </button>
      <button
        aria-label="알림 닫기"
        className="office-meeting-summary-alert-close"
        onClick={onClose}
        type="button"
      >
        ×
      </button>
    </div>
  );
}
