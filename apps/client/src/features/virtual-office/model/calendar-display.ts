interface CalendarEventPeriod {
  endsAt: string;
  startsAt: string;
}

export function eventOccursOnDay(event: CalendarEventPeriod, day: Date): boolean {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = addDays(day, 1).getTime();
  const eventStart = new Date(event.startsAt).getTime();
  const eventEnd = new Date(event.endsAt).getTime();

  return eventStart < dayEnd && eventEnd > dayStart;
}

export function startOfDay(value: Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(value: Date, days: number): Date {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return startOfDay(date);
}

export function getWeekDays(value: Date): Date[] {
  const day = value.getDay() || 7;
  const monday = addDays(value, 1 - day);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function getMonthGridDays(value: Date): Date[] {
  const firstDayOfMonth = new Date(value.getFullYear(), value.getMonth(), 1);
  const gridStart = addDays(firstDayOfMonth, -firstDayOfMonth.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export function addMonths(value: Date, months: number): Date {
  return new Date(value.getFullYear(), value.getMonth() + months, 1);
}
