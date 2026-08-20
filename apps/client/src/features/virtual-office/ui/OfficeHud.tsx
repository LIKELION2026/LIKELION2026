import { type AttendanceStatus, type MemberStatus } from "@likelion2026/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { OFFICE_STATUS_OPTIONS, type OfficeConnectionState } from "../model/office-store";
import { AvatarFace } from "./AvatarFace";

const STATUS_ICONS: Record<MemberStatus, string> = {
  available: "●",
  away: "◐",
  focused: "◆",
  in_meeting: "✦"
};

interface OfficeHudProps {
  avatarId: string | undefined;
  connectionState: OfficeConnectionState;
  memberCount: number;
  onAttendanceChange: (attendanceStatus: AttendanceStatus) => void;
  onOpenCalendar: () => void;
  onOpenPeople: () => void;
  onOpenTodo: () => void;
  onStatusChange: (status: MemberStatus) => void;
  selfAttendanceStatus: AttendanceStatus | undefined;
  selfStatus: MemberStatus | undefined;
}

export function OfficeHud({
  avatarId,
  connectionState,
  memberCount,
  onAttendanceChange,
  onOpenCalendar,
  onOpenPeople,
  onOpenTodo,
  onStatusChange,
  selfAttendanceStatus,
  selfStatus
}: OfficeHudProps): React.JSX.Element {
  const { t } = useTranslation();
  const [isStatusPickerOpen, setIsStatusPickerOpen] = useState(false);
  const currentStatus = selfStatus ?? "available";

  return (
    <div className="office-hud">
      <section className="hud-panel" aria-label={t("officeHud.ariaLabel")}>
        <header className="hud-header">
          <AvatarFace avatarId={avatarId} size={56} />
          <div className="hud-header-text">
            <p className="hud-title">{t("officeHud.teamName")}</p>
            <p className="hud-meta">{t("officeHud.memberCount", { count: memberCount })}</p>
            <div className="connection-state">
              <span className={`connection-dot ${connectionState}`} />
              {t(`officeHud.connection.${connectionState}`)}
            </div>
          </div>
        </header>
        <button
          className="attendance-button"
          onClick={() =>
            onAttendanceChange(
              selfAttendanceStatus === "working" ? "checked_out" : "working"
            )
          }
          type="button"
        >
          {selfAttendanceStatus === "working"
            ? t("officeHud.attendance.checkOut")
            : t("officeHud.attendance.checkIn")}
        </button>
        <div className="status-picker-wrap">
          <button
            aria-expanded={isStatusPickerOpen}
            aria-haspopup="menu"
            aria-label={t("officeHud.statusAriaLabel")}
            className={`status-trigger tone-${currentStatus}`}
            onClick={() => setIsStatusPickerOpen((current) => !current)}
            type="button"
          >
            <span aria-hidden="true" className="status-trigger-icon">{STATUS_ICONS[currentStatus]}</span>
            <span className="status-trigger-copy">
              <small>{t("officeHud.statusAriaLabel")}</small>
              <strong>{t(`memberStatus.${currentStatus}`)}</strong>
            </span>
            <span aria-hidden="true" className="status-trigger-chevron">▾</span>
          </button>
          {isStatusPickerOpen ? (
            <div aria-label={t("officeHud.statusAriaLabel")} className="status-picker" role="menu">
              {OFFICE_STATUS_OPTIONS.map((status) => (
                <button
                  aria-checked={status === currentStatus}
                  className={`status-picker-option tone-${status}`}
                  key={status}
                  onClick={() => {
                    onStatusChange(status);
                    setIsStatusPickerOpen(false);
                  }}
                  role="menuitemradio"
                  type="button"
                >
                  <span aria-hidden="true">{STATUS_ICONS[status]}</span>
                  {t(`memberStatus.${status}`)}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="hud-nav">
          <button className="office-secondary-button" onClick={onOpenPeople} type="button">
            {t("officeHud.navigation.people")}
          </button>
          <button className="office-secondary-button" onClick={onOpenTodo} type="button">
            {t("officeHud.navigation.todo")}
          </button>
          <button className="office-secondary-button" onClick={onOpenCalendar} type="button">
            {t("officeHud.navigation.calendar")}
          </button>
        </div>
      </section>
    </div>
  );
}
