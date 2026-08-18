import { useEffect, useMemo, useState } from "react";
import type {
  CalendarEventType,
  OfficeMemberPresence,
  OfficeTodo
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

interface OfficeCalendarModalProps {
  controller: OfficeCalendarController;
  isOpen: boolean;
  members: OfficeMemberPresence[];
  onClose: () => void;
  ownTodos: OfficeTodo[];
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

export function OfficeCalendarModal({
  controller,
  isOpen,
  members,
  onClose,
  ownTodos,
  self
}: OfficeCalendarModalProps): React.JSX.Element | null {
  const { showError, showSuccess } = useRequestFeedback();
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<CalendarEventType>("vacation");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const monthDays = useMemo(() => getMonthGridDays(visibleMonth), [visibleMonth]);
  const visibleRange = useMemo(() => getMonthRange(monthDays), [monthDays]);
  const memberNames = useMemo(() => {
    const names = new Map(members.map((member) => [member.memberId, member.displayName]));
    if (self) {
      names.set(self.memberId, self.displayName);
    }
    return names;
  }, [members, self]);
  const ownStatuses = controller.memberStatuses.filter(
    (status) => status.memberId === self?.memberId
  );
  const selectedEvents = controller.events.filter((event) =>
    eventOccursOnDay(event, selectedDate)
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

  const addEvent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const startsAt = startOfDay(selectedDate);
      const endsAt = addDays(startsAt, 1);
      await controller.createEvent({
        endsAt: endsAt.toISOString(),
        eventType,
        isAllDay: true,
        startsAt: startsAt.toISOString(),
        title: title.trim()
      });
      setTitle("");
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
    <div className="office-calendar-backdrop">
      <section
        aria-label="협업 보드"
        aria-modal="true"
        className="office-calendar-modal"
        role="dialog"
      >
        <header className="office-calendar-header">
          <div>
            <p className="office-panel-eyebrow">COLLABORATION BOARD</p>
            <h2>내 상태와 공유 캘린더</h2>
          </div>
          <button
            aria-label="협업 보드 닫기"
            className="office-icon-button"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <div className="office-calendar-layout">
          <aside className="office-calendar-personal">
            <div className="office-calendar-avatar">
              {self?.displayName.slice(0, 1) ?? "나"}
            </div>
            <h3>{self?.displayName ?? "내 프로필"}</h3>
            <p className="office-panel-message">오늘의 협업 상태와 업무</p>
            <div className="office-calendar-statuses">
              {ownStatuses.length ? (
                ownStatuses.map((status) => (
                  <span key={status.eventId}>{labelForType(status.eventType)}</span>
                ))
              ) : (
                <span>공유 일정 없음</span>
              )}
            </div>

            <section className="office-calendar-todos">
              <p className="office-member-todos-title">오늘의 TODO</p>
              {ownTodos.length ? (
                <ul>
                  {ownTodos.map((todo) => (
                    <li key={todo.id}>{todo.title}</li>
                  ))}
                </ul>
              ) : (
                <p className="office-panel-message">작성한 TODO가 없습니다.</p>
              )}
            </section>
          </aside>

          <div className="office-calendar-content">
            <div className="office-calendar-month-heading">
              <h3>{formatMonth(visibleMonth)}</h3>
              <div>
                <button aria-label="이전 달 보기" onClick={() => changeMonth(-1)} type="button">‹</button>
                <button onClick={moveToToday} type="button">오늘</button>
                <button aria-label="다음 달 보기" onClick={() => changeMonth(1)} type="button">›</button>
              </div>
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

            <div className="office-calendar-weekdays" aria-hidden="true">
              {WEEKDAY_LABELS.map((label) => <span key={label}>{label}</span>)}
            </div>
            <div className="office-calendar-grid" role="grid">
              {monthDays.map((day) => {
                const events = controller.events.filter((event) => eventOccursOnDay(event, day));
                const isSelected = isSameDay(day, selectedDate);
                return (
                  <button
                    aria-pressed={isSelected}
                    className={`${isSameMonth(day, visibleMonth) ? "" : "outside-month"} ${isSelected ? "selected" : ""}`}
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    type="button"
                  >
                    <strong>{day.getDate()}</strong>
                    {events.slice(0, 3).map((event) => (
                      <span className={`calendar-event ${event.eventType}`} key={event.id}>
                        {getEventOwnerName(event.createdByMemberId, memberNames)} · {labelForType(event.eventType)}
                      </span>
                    ))}
                    {events.length > 3 ? <small>+{events.length - 3}개 더</small> : null}
                  </button>
                );
              })}
            </div>

            <div className="office-calendar-detail">
              <section>
                <h3>{formatSelectedDate(selectedDate)} 일정</h3>
                {selectedEvents.length ? (
                  <ul>
                    {selectedEvents.map((event) => (
                      <li key={event.id}>
                        <span>
                          <strong>
                            {getEventOwnerName(event.createdByMemberId, memberNames)} · {labelForType(event.eventType)}
                          </strong>
                          <small>{event.title} · {event.isAllDay ? "종일" : "시간 지정"}</small>
                        </span>
                        {event.createdByMemberId === self?.memberId ? (
                          <button disabled={isSubmitting} onClick={() => void deleteEvent(event.id)} type="button">
                            삭제
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="office-panel-message">등록된 일정이 없습니다.</p>
                )}
              </section>

              <form onSubmit={addEvent}>
                <h3>일정 추가</h3>
                <input
                  disabled={isSubmitting}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="예: 베트남 팀과 기획 회의"
                  value={title}
                />
                <select
                  disabled={isSubmitting}
                  onChange={(event) => setEventType(event.target.value as CalendarEventType)}
                  value={eventType}
                >
                  {EVENT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
                <button className="attendance-button" disabled={isSubmitting} type="submit">
                  {isSubmitting ? <><RequestSpinner />저장 중</> : "일정 추가"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
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

function formatMonth(value: Date): string {
  return new Intl.DateTimeFormat("ko-KR", { month: "long", year: "numeric" }).format(value);
}

function formatSelectedDate(value: Date): string {
  return new Intl.DateTimeFormat("ko-KR", { day: "numeric", month: "long", weekday: "long" }).format(value);
}

function labelForType(type: CalendarEventType): string {
  return EVENT_TYPES.find((option) => option.value === type)?.label ?? type;
}

function getEventOwnerName(memberId: string | undefined, memberNames: Map<string, string>): string {
  return memberId ? memberNames.get(memberId) ?? "팀원" : "팀원";
}
