import { type AttendanceStatus, type MemberStatus } from "@likelion2026/shared";
import { useTranslation } from "react-i18next";

import { useUiLocale } from "../../../shared/i18n";
import { OFFICE_STATUS_OPTIONS, type OfficeConnectionState } from "../model/office-store";
import { AvatarFace } from "./AvatarFace";

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
  const { locale, options: uiLocaleOptions, setLocale } = useUiLocale();

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
        <select
          aria-label={t("officeHud.statusAriaLabel")}
          className="status-control"
          onChange={(event) => onStatusChange(event.target.value as MemberStatus)}
          value={selfStatus ?? "available"}
        >
          {OFFICE_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {t(`memberStatus.${status}`)}
            </option>
          ))}
        </select>
        <label className="hud-locale-control" htmlFor="office-ui-locale">
          <span>{t("officeHud.settings.uiLanguage")}</span>
          <select
            className="hud-locale-select"
            id="office-ui-locale"
            onChange={(event) => setLocale(event.target.value as typeof locale)}
            value={locale}
          >
            {uiLocaleOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
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
