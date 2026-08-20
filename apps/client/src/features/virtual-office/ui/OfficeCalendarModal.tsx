import { useEffect, useMemo, useState } from "react";
import type {
  CalendarEventType,
  OfficeCalendarEvent,
  OfficeMemberPresence
} from "@likelion2026/shared";
import { useTranslation } from "react-i18next";

import { RequestSpinner, useRequestFeedback } from "../../../app/request-feedback";
import { formatDateTime, type UiLocale, useUiLocale } from "../../../shared/i18n";
import {
  addDays,
  addMonths,
  eventOccursOnDay,
  getMonthGridDays,
  startOfDay
} from "../model/calendar-display";
import type {
  OfficeCalendarController,
  OfficeCalendarRange
} from "../model/use-office-calendar";
import { AvatarFace } from "./AvatarFace";

interface OfficeCalendarModalProps {
  controller: OfficeCalendarController;
  isOpen: boolean;
  members: OfficeMemberPresence[];
  onClose: () => void;
  self: OfficeMemberPresence | null;
}

const EVENT_TYPES: CalendarEventType[] = [
  "vacation",
  "remote_work",
  "absence",
  "meeting",
  "focus"
];

const WEEKDAY_INDEXES = [0, 1, 2, 3, 4, 5, 6];

const MEMBER_BADGE_COLORS = [
  "#8b5e3c",
  "#7c5fb0",
  "#3d8b62",
  "#c9793a",
  "#3d6fa6",
  "#b0507e",
  "#4f9d9d",
  "#a04545",
  "#6b7f3a",
  "#c99a1f",
  "#5c6bc0",
  "#8e6b8e"
];

const MAX_VISIBLE_LEGEND = 4;

const FALLBACK_MEMBER_COLOR = "#9c8468";

function getEventOwnerId(event: OfficeCalendarEvent): string | undefined {
  return event.participantMemberIds[0] ?? event.createdByMemberId;
}

function CharacterBadge({
  avatarId,
  color,
  size = 32
}: {
  avatarId: string | undefined;
  color: string;
  size?: number;
}): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      className="cal-face-ring"
      style={{ borderColor: color, height: size, width: size }}
    >
      <AvatarFace avatarId={avatarId} size={size} />
    </span>
  );
}

function LegendBadge({
  entry,
  isActive,
  onToggle
}: {
  entry: { avatarId: string | undefined; color: string; memberId: string; name: string };
  isActive: boolean;
  onToggle: (memberId: string) => void;
}): React.JSX.Element {
  return (
    <button
      aria-pressed={isActive}
      className={`cal-legend-badge ${isActive ? "active" : ""}`}
      onClick={() => onToggle(entry.memberId)}
      style={{ "--badge-color": entry.color } as React.CSSProperties}
      type="button"
    >
      <AvatarFace avatarId={entry.avatarId} size={40} />
      <span className="cal-legend-name">{entry.name}</span>
    </button>
  );
}

export function OfficeCalendarModal({
  controller,
  isOpen,
  members,
  onClose,
  self
}: OfficeCalendarModalProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = useUiLocale();
  const { showError, showSuccess } = useRequestFeedback();
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<CalendarEventType>("vacation");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterMemberIds, setFilterMemberIds] = useState<Set<string>>(new Set());
  const [isLegendModalOpen, setIsLegendModalOpen] = useState(false);
  const [expandedSummaryEventIds, setExpandedSummaryEventIds] = useState<Set<string>>(new Set());
  const monthDays = useMemo(() => getMonthGridDays(visibleMonth), [visibleMonth]);
  const visibleRange = useMemo(() => getMonthRange(monthDays), [monthDays]);
  const memberNames = useMemo(() => {
    const names = new Map(members.map((member) => [member.memberId, member.displayName]));
    if (self) {
      names.set(self.memberId, self.displayName);
    }
    return names;
  }, [members, self]);
  const memberAvatarIds = useMemo(() => {
    const avatarIds = new Map(members.map((member) => [member.memberId, member.avatarId]));
    if (self) {
      avatarIds.set(self.memberId, self.avatarId);
    }
    return avatarIds;
  }, [members, self]);
  const monthLegend = useMemo(
    () =>
      getMonthLegend(
        controller.events,
        monthDays,
        memberNames,
        memberAvatarIds,
        t("common.teamMember")
      ),
    [controller.events, memberAvatarIds, memberNames, monthDays, t]
  );
  const memberColorMap = useMemo(
    () => new Map(monthLegend.map((entry) => [entry.memberId, entry.color])),
    [monthLegend]
  );
  const hasOverflowLegend = monthLegend.length > MAX_VISIBLE_LEGEND;
  const visibleLegend = hasOverflowLegend
    ? monthLegend.slice(0, MAX_VISIBLE_LEGEND)
    : monthLegend;
  const overflowLegend = hasOverflowLegend ? monthLegend.slice(MAX_VISIBLE_LEGEND) : [];
  const matchesFilter = (event: OfficeCalendarEvent): boolean => {
    if (filterMemberIds.size === 0) {
      return true;
    }
    const ids = event.participantMemberIds.length ? event.participantMemberIds : [event.createdByMemberId];
    return ids.some((id) => id !== undefined && filterMemberIds.has(id));
  };
  const selectedEvents = controller.events.filter(
    (event) => eventOccursOnDay(event, selectedDate) && matchesFilter(event)
  );

  useEffect(() => {
    if (isOpen) {
      void controller.refresh(visibleRange);
    }
  }, [controller.refresh, isOpen, visibleRange]);

  if (!isOpen) {
    return null;
  }

  const changeMonth = (offset: number) => {
    const nextMonth = addMonths(visibleMonth, offset);
    setVisibleMonth(nextMonth);
    setSelectedDate(startOfMonth(nextMonth));
  };

  const moveToToday = () => {
    const today = startOfDay(new Date());
    setVisibleMonth(startOfMonth(today));
    setSelectedDate(today);
  };

  const toggleFilterMember = (memberId: string) => {
    setFilterMemberIds((current) => {
      const next = new Set(current);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const clearFilter = () => setFilterMemberIds(new Set());

  const toggleSummaryExpanded = (eventId: string) => {
    setExpandedSummaryEventIds((current) => {
      const next = new Set(current);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const addEvent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }

    const hasTimeRange = Boolean(startTime && endTime);
    const startsAt = hasTimeRange ? combineDateAndTime(selectedDate, startTime) : startOfDay(selectedDate);
    const endsAt = hasTimeRange ? combineDateAndTime(selectedDate, endTime) : addDays(startsAt, 1);
    if (hasTimeRange && endsAt <= startsAt) {
      showError(
        new Error("officeCalendar.errors.endBeforeStart"),
        t("officeCalendar.errors.endBeforeStart")
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await controller.createEvent({
        endsAt: endsAt.toISOString(),
        eventType,
        isAllDay: !hasTimeRange,
        location: location.trim() || undefined,
        startsAt: startsAt.toISOString(),
        title: title.trim()
      });
      setTitle("");
      setStartTime("");
      setEndTime("");
      setLocation("");
      showSuccess(t("officeCalendar.success.saved"));
    } catch (error) {
      showError(error, t("officeCalendar.errors.saveFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteEvent = async (eventId: string) => {
    setIsSubmitting(true);
    try {
      await controller.deleteEvent(eventId);
      showSuccess(t("officeCalendar.success.deleted"));
    } catch (error) {
      showError(error, t("officeCalendar.errors.deleteFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cal-backdrop">
      <section aria-label={t("officeCalendar.ariaLabel")} aria-modal="true" className="cal-modal" role="dialog">
        <header className="cal-header">
          <div className="cal-header-title">
            <span aria-hidden="true">📅</span>
            {t("officeCalendar.title")}
          </div>
          <button aria-label={t("officeCalendar.close")} className="cal-close-button" onClick={onClose} type="button">
            ×
          </button>
        </header>

        <div className="cal-card">
          <div className="cal-toolbar">
            <div className="cal-nav-buttons">
              <button aria-label={t("officeCalendar.previousMonth")} onClick={() => changeMonth(-1)} type="button">‹</button>
              <button aria-label={t("officeCalendar.nextMonth")} onClick={() => changeMonth(1)} type="button">›</button>
              <button className="cal-today-button" onClick={moveToToday} type="button">{t("officeCalendar.today")}</button>
            </div>
            <h3 className="cal-month-title">{formatMonth(visibleMonth, locale)}</h3>
            <span className="cal-view-badge">{t("officeCalendar.monthly")}</span>
          </div>

          {controller.error ? (
            <div className="office-request-error">
              <p className="office-panel-error">{t("officeCalendar.errors.loadFailed")}</p>
              <button className="office-secondary-button" onClick={() => void controller.refresh()} type="button">
                {t("officeCalendar.retry")}
              </button>
            </div>
          ) : null}
          {controller.isLoading ? (
            <p className="office-panel-message"><RequestSpinner />{t("officeCalendar.loading")}</p>
          ) : null}

          {monthLegend.length ? (
            <div className="cal-legend" aria-label={t("officeCalendar.legendFilter")}>
              {visibleLegend.map((entry) => (
                <LegendBadge
                  entry={entry}
                  isActive={filterMemberIds.has(entry.memberId)}
                  key={entry.memberId}
                  onToggle={toggleFilterMember}
                />
              ))}
              {hasOverflowLegend ? (
                <button
                  aria-label={t("officeCalendar.legendMore", {
                    count: overflowLegend.length
                  })}
                  className="cal-legend-more"
                  onClick={() => setIsLegendModalOpen(true)}
                  type="button"
                >
                  <span className="cal-avatar-dot cal-avatar-dot--more" aria-hidden="true">+{overflowLegend.length}</span>
                </button>
              ) : null}
            </div>
          ) : null}

          {isLegendModalOpen ? (
            <div className="cal-legend-modal-backdrop" onClick={() => setIsLegendModalOpen(false)}>
              <div
                aria-label={t("officeCalendar.legendAll")}
                className="cal-legend-modal"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
              >
                <header>
                  <h3>{t("officeCalendar.ownerCount", { count: monthLegend.length })}</h3>
                  <button aria-label={t("common.close")} className="cal-close-button" onClick={() => setIsLegendModalOpen(false)} type="button">
                    ×
                  </button>
                </header>
                <div className="cal-legend-modal-list">
                  {monthLegend.map((entry) => (
                    <LegendBadge
                      entry={entry}
                      isActive={filterMemberIds.has(entry.memberId)}
                      key={entry.memberId}
                      onToggle={toggleFilterMember}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {filterMemberIds.size ? (
            <button className="cal-legend-clear" onClick={clearFilter} type="button">
              {t("officeCalendar.resetFilter")}
            </button>
          ) : null}

          <div className="cal-weekdays" aria-hidden="true">
            {WEEKDAY_INDEXES.map((index) => {
              const label = formatWeekdayShort(index, locale);
              return (
              <span className={weekdayClassName(index)} key={label}>{label}</span>
              );
            })}
          </div>

          <div className="cal-grid" role="grid">
            {monthDays.map((day) => {
              const events = controller.events.filter(
                (event) => eventOccursOnDay(event, day) && matchesFilter(event)
              );
              const isSelected = isSameDay(day, selectedDate);
              const weekdayIndex = day.getDay();
              return (
                <button
                  aria-pressed={isSelected}
                  className={[
                    "cal-day",
                    isSameMonth(day, visibleMonth) ? "" : "outside-month",
                    isSelected ? "selected" : "",
                    weekdayClassName(weekdayIndex)
                  ].filter(Boolean).join(" ")}
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  type="button"
                >
                  <strong>{day.getDate()}</strong>
                  <span className="cal-day-events">
                    {events.slice(0, 2).map((event) => {
                      const ownerId = getEventOwnerId(event);
                      return (
                        <span className="cal-event-tag" key={event.id}>
                          <span
                            aria-hidden="true"
                            className="cal-tag-dot"
                            style={{ background: (ownerId && memberColorMap.get(ownerId)) || FALLBACK_MEMBER_COLOR }}
                          />
                          {getEventOwnerName(event, memberNames, t("common.teamMember"))} · {event.title}
                        </span>
                      );
                    })}
                    {events.length > 2 ? <small>+{events.length - 2}</small> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="cal-card cal-detail-card">
          <div className="cal-date-block">
            <p className="cal-date-year">{t("officeCalendar.dateYear", { year: selectedDate.getFullYear() })}</p>
            <p className="cal-date-big">{formatBigDate(selectedDate, locale)}</p>
            <p className="cal-date-weekday">{formatWeekdayLong(selectedDate, locale)}</p>
          </div>

          <div className="cal-detail-list">
            <div className="cal-detail-list-head">
              <span>{t("officeCalendar.tableHeadTime")}</span>
              <span>{t("officeCalendar.tableHeadSchedule")}</span>
            </div>
            {selectedEvents.length ? (
              <ul>
                {selectedEvents.map((event) => {
                  const ownerId = getEventOwnerId(event);
                  return (
                  <li key={event.id}>
                    <span
                      aria-hidden="true"
                      className="cal-time-bar"
                      style={{ background: (ownerId && memberColorMap.get(ownerId)) || FALLBACK_MEMBER_COLOR }}
                    />
                    <span className="cal-detail-time">
                      {event.isAllDay ? t("officeCalendar.allDay") : formatTimeRange(event, locale)}
                    </span>
                    <span className="cal-detail-title">
                      <strong>{event.title}</strong>
                      {event.location ? <small>{event.location}</small> : null}
                      {event.eventType === "meeting" && (event.summaryKo || event.summaryVi) ? (
                        <button
                          className={[
                            "cal-detail-summary",
                            expandedSummaryEventIds.has(event.id) ? "expanded" : ""
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => toggleSummaryExpanded(event.id)}
                          type="button"
                        >
                          {(self?.language === "vi" ? event.summaryVi : event.summaryKo) ??
                            event.summaryKo ??
                            event.summaryVi}
                        </button>
                      ) : null}
                    </span>
                    <span className="cal-detail-owners">
                      {getEventOwnerNames(
                        event,
                        memberNames,
                        t("common.teamMember")
                      ).map((name, index) => {
                        const ownerMemberId = event.participantMemberIds[index] ?? event.createdByMemberId ?? name;
                        return (
                          <span className="cal-owner-badge" key={`${event.id}-${index}`}>
                            <CharacterBadge
                              avatarId={memberAvatarIds.get(ownerMemberId)}
                              color={memberColorMap.get(ownerMemberId) ?? FALLBACK_MEMBER_COLOR}
                              size={20}
                            />
                            {name}
                          </span>
                        );
                      })}
                    </span>
                    {event.createdByMemberId === self?.memberId ? (
                      <button
                        aria-label={t("officeCalendar.deleteAriaLabel", {
                          title: event.title
                        })}
                        className="cal-delete-button"
                        disabled={isSubmitting}
                        onClick={() => void deleteEvent(event.id)}
                        type="button"
                      >
                        ×
                      </button>
                    ) : null}
                  </li>
                  );
                })}
              </ul>
            ) : (
              <p className="office-panel-message">{t("officeCalendar.empty")}</p>
            )}

            <form className="cal-add-form" onSubmit={addEvent}>
              <div className="cal-add-form-row">
                <input
                  className="cal-add-title"
                  disabled={isSubmitting}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t("officeCalendar.formTitlePlaceholder")}
                  value={title}
                />
                <select
                  aria-label={t("officeCalendar.eventTypeAriaLabel")}
                  disabled={isSubmitting}
                  onChange={(event) => setEventType(event.target.value as CalendarEventType)}
                  value={eventType}
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(`officeCalendar.eventTypes.${type}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="cal-add-form-row">
                <input
                  aria-label={t("officeCalendar.startTime")}
                  disabled={isSubmitting}
                  onChange={(event) => setStartTime(event.target.value)}
                  type="time"
                  value={startTime}
                />
                <span aria-hidden="true">~</span>
                <input
                  aria-label={t("officeCalendar.endTime")}
                  disabled={isSubmitting}
                  onChange={(event) => setEndTime(event.target.value)}
                  type="time"
                  value={endTime}
                />
                <input
                  aria-label={t("officeCalendar.location")}
                  className="cal-add-location"
                  disabled={isSubmitting}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder={t("officeCalendar.locationPlaceholder")}
                  value={location}
                />
                <button className="cal-add-button" disabled={isSubmitting} type="submit">
                  {isSubmitting ? <><RequestSpinner />{t("officeCalendar.saving")}</> : t("officeCalendar.add")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const combined = new Date(date);
  combined.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return combined;
}

function getMonthRange(days: Date[]): OfficeCalendarRange {
  const startsAt = days[0] ?? startOfDay(new Date());
  const endsAt = addDays(days.at(-1) ?? startsAt, 1);
  return { endsAt: endsAt.toISOString(), startsAt: startsAt.toISOString() };
}

function isSameDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function isSameMonth(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

function weekdayClassName(index: number): string {
  if (index === 0) return "is-sunday";
  if (index === 6) return "is-saturday";
  return "";
}

function formatMonth(value: Date, locale: UiLocale): string {
  return formatDateTime(value, locale, { month: "long", year: "numeric" });
}

function formatBigDate(value: Date, locale: UiLocale): string {
  return formatDateTime(value, locale, { day: "2-digit", month: "2-digit" });
}

function formatWeekdayShort(weekdayIndex: number, locale: UiLocale): string {
  const sunday = new Date(Date.UTC(2026, 7, 16 + weekdayIndex));
  return formatDateTime(sunday, locale, { timeZone: "UTC", weekday: "short" });
}

function formatWeekdayLong(value: Date, locale: UiLocale): string {
  return formatDateTime(value, locale, { weekday: "long" });
}

function formatTimeRange(event: OfficeCalendarEvent, locale: UiLocale): string {
  const format = (iso: string) =>
    formatDateTime(iso, locale, {
      hour: "2-digit",
      hour12: false,
      minute: "2-digit"
    });
  return `${format(event.startsAt)} - ${format(event.endsAt)}`;
}

function getEventOwnerName(
  event: OfficeCalendarEvent,
  memberNames: Map<string, string>,
  fallbackName: string
): string {
  const memberId = event.participantMemberIds[0] ?? event.createdByMemberId;
  return memberId ? memberNames.get(memberId) ?? fallbackName : fallbackName;
}

function getEventOwnerNames(
  event: OfficeCalendarEvent,
  memberNames: Map<string, string>,
  fallbackName: string
): string[] {
  const ids = event.participantMemberIds.length ? event.participantMemberIds : [event.createdByMemberId ?? ""];
  const names = ids.filter(Boolean).map((id) => memberNames.get(id) ?? fallbackName);
  return names.length ? names : [fallbackName];
}

function getMonthLegend(
  events: OfficeCalendarEvent[],
  monthDays: Date[],
  memberNames: Map<string, string>,
  memberAvatarIds: Map<string, string>,
  fallbackName: string
): Array<{ avatarId: string | undefined; color: string; memberId: string; name: string }> {
  const monthEvents = events.filter((event) =>
    monthDays.some((day) => eventOccursOnDay(event, day))
  );
  const seen = new Map<string, string>();
  for (const event of monthEvents) {
    const ids = event.participantMemberIds.length ? event.participantMemberIds : [event.createdByMemberId];
    for (const id of ids) {
      if (id && !seen.has(id)) {
        seen.set(id, memberNames.get(id) ?? fallbackName);
      }
    }
  }
  return Array.from(seen.entries()).map(([memberId, name], index) => ({
    avatarId: memberAvatarIds.get(memberId),
    color: MEMBER_BADGE_COLORS[index % MEMBER_BADGE_COLORS.length]!,
    memberId,
    name
  }));
}
