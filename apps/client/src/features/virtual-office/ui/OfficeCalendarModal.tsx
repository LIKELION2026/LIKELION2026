import { useEffect, useMemo, useState } from "react";
import type {
  CalendarEventType,
  OfficeCalendarEvent,
  OfficeMemberPresence
} from "@likelion2026/shared";

import { RequestSpinner, useRequestFeedback } from "../../../app/request-feedback";
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

const EVENT_TYPES: Array<{ value: CalendarEventType; label: string }> = [
  { label: "휴가", value: "vacation" },
  { label: "재택", value: "remote_work" },
  { label: "부재", value: "absence" },
  { label: "회의", value: "meeting" },
  { label: "집중", value: "focus" }
];

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

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
    () => getMonthLegend(controller.events, monthDays, memberNames, memberAvatarIds),
    [controller.events, memberAvatarIds, memberNames, monthDays]
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

  const addEvent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }

    const hasTimeRange = Boolean(startTime && endTime);
    const startsAt = hasTimeRange ? combineDateAndTime(selectedDate, startTime) : startOfDay(selectedDate);
    const endsAt = hasTimeRange ? combineDateAndTime(selectedDate, endTime) : addDays(startsAt, 1);
    if (hasTimeRange && endsAt <= startsAt) {
      showError(new Error("종료 시간이 시작 시간보다 빨라요."), "종료 시간이 시작 시간보다 빨라요.");
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
      showSuccess("일정을 공유했습니다.");
    } catch (error) {
      showError(error, "일정을 저장하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteEvent = async (eventId: string) => {
    setIsSubmitting(true);
    try {
      await controller.deleteEvent(eventId);
      showSuccess("일정을 삭제했습니다.");
    } catch (error) {
      showError(error, "일정을 삭제하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cal-backdrop">
      <section aria-label="협업 보드" aria-modal="true" className="cal-modal" role="dialog">
        <header className="cal-header">
          <div className="cal-header-title">
            <span aria-hidden="true">📅</span>
            공유 캘린더
          </div>
          <button aria-label="협업 보드 닫기" className="cal-close-button" onClick={onClose} type="button">
            ×
          </button>
        </header>

        <div className="cal-card">
          <div className="cal-toolbar">
            <div className="cal-nav-buttons">
              <button aria-label="이전 달 보기" onClick={() => changeMonth(-1)} type="button">‹</button>
              <button aria-label="다음 달 보기" onClick={() => changeMonth(1)} type="button">›</button>
              <button className="cal-today-button" onClick={moveToToday} type="button">오늘</button>
            </div>
            <h3 className="cal-month-title">{formatMonth(visibleMonth)}</h3>
            <span className="cal-view-badge">월간</span>
          </div>

          {controller.error ? (
            <div className="office-request-error">
              <p className="office-panel-error">공유 일정을 불러오지 못했습니다.</p>
              <button className="office-secondary-button" onClick={() => void controller.refresh()} type="button">
                다시 시도
              </button>
            </div>
          ) : null}
          {controller.isLoading ? (
            <p className="office-panel-message"><RequestSpinner />일정을 불러오는 중입니다.</p>
          ) : null}

          {monthLegend.length ? (
            <div className="cal-legend" aria-label="이번 달 일정 참여자 필터">
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
                  aria-label={`참여자 ${overflowLegend.length}명 더 보기`}
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
                aria-label="이번 달 일정 참여자 전체"
                className="cal-legend-modal"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
              >
                <header>
                  <h3>참여자 {monthLegend.length}명</h3>
                  <button aria-label="닫기" className="cal-close-button" onClick={() => setIsLegendModalOpen(false)} type="button">
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
              전체 보기로 되돌리기
            </button>
          ) : null}

          <div className="cal-weekdays" aria-hidden="true">
            {WEEKDAY_LABELS.map((label, index) => (
              <span className={weekdayClassName(index)} key={label}>{label}</span>
            ))}
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
                          {getEventOwnerName(event, memberNames)} · {event.title}
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
            <p className="cal-date-year">{selectedDate.getFullYear()}년</p>
            <p className="cal-date-big">{formatBigDate(selectedDate)}</p>
            <p className="cal-date-weekday">{formatWeekdayLong(selectedDate)}</p>
          </div>

          <div className="cal-detail-list">
            <div className="cal-detail-list-head">
              <span>시간</span>
              <span>일정</span>
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
                      {event.isAllDay ? "종일" : formatTimeRange(event)}
                    </span>
                    <span className="cal-detail-title">
                      <strong>{event.title}</strong>
                      {event.location ? <small>{event.location}</small> : null}
                    </span>
                    <span className="cal-detail-owners">
                      {getEventOwnerNames(event, memberNames).map((name, index) => {
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
                        aria-label={`${event.title} 삭제`}
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
              <p className="office-panel-message">등록된 일정이 없습니다.</p>
            )}

            <form className="cal-add-form" onSubmit={addEvent}>
              <div className="cal-add-form-row">
                <input
                  className="cal-add-title"
                  disabled={isSubmitting}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="예: 베트남 팀과 기획 회의"
                  value={title}
                />
                <select
                  aria-label="일정 종류"
                  disabled={isSubmitting}
                  onChange={(event) => setEventType(event.target.value as CalendarEventType)}
                  value={eventType}
                >
                  {EVENT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </div>
              <div className="cal-add-form-row">
                <input
                  aria-label="시작 시간"
                  disabled={isSubmitting}
                  onChange={(event) => setStartTime(event.target.value)}
                  type="time"
                  value={startTime}
                />
                <span aria-hidden="true">~</span>
                <input
                  aria-label="종료 시간"
                  disabled={isSubmitting}
                  onChange={(event) => setEndTime(event.target.value)}
                  type="time"
                  value={endTime}
                />
                <input
                  aria-label="장소"
                  className="cal-add-location"
                  disabled={isSubmitting}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="장소 (선택)"
                  value={location}
                />
                <button className="cal-add-button" disabled={isSubmitting} type="submit">
                  {isSubmitting ? <><RequestSpinner />저장 중</> : "일정 추가"}
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

function formatMonth(value: Date): string {
  return new Intl.DateTimeFormat("ko-KR", { month: "long", year: "numeric" }).format(value);
}

function formatBigDate(value: Date): string {
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${month}.${day}`;
}

function formatWeekdayLong(value: Date): string {
  return new Intl.DateTimeFormat("ko-KR", { weekday: "long" }).format(value);
}

function formatTimeRange(event: OfficeCalendarEvent): string {
  const format = (iso: string) => new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
  return `${format(event.startsAt)} - ${format(event.endsAt)}`;
}

function getEventOwnerName(event: OfficeCalendarEvent, memberNames: Map<string, string>): string {
  const memberId = event.participantMemberIds[0] ?? event.createdByMemberId;
  return memberId ? memberNames.get(memberId) ?? "팀원" : "팀원";
}

function getEventOwnerNames(event: OfficeCalendarEvent, memberNames: Map<string, string>): string[] {
  const ids = event.participantMemberIds.length ? event.participantMemberIds : [event.createdByMemberId ?? ""];
  const names = ids.filter(Boolean).map((id) => memberNames.get(id) ?? "팀원");
  return names.length ? names : ["팀원"];
}

function getMonthLegend(
  events: OfficeCalendarEvent[],
  monthDays: Date[],
  memberNames: Map<string, string>,
  memberAvatarIds: Map<string, string>
): Array<{ avatarId: string | undefined; color: string; memberId: string; name: string }> {
  const monthEvents = events.filter((event) =>
    monthDays.some((day) => eventOccursOnDay(event, day))
  );
  const seen = new Map<string, string>();
  for (const event of monthEvents) {
    const ids = event.participantMemberIds.length ? event.participantMemberIds : [event.createdByMemberId];
    for (const id of ids) {
      if (id && !seen.has(id)) {
        seen.set(id, memberNames.get(id) ?? "팀원");
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
