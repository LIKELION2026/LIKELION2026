import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CalendarMemberStatus,
  CreateOfficeCalendarEventRequest,
  GuestOfficeSessionResponse,
  OfficeCalendarEvent,
  UpdateOfficeCalendarEventRequest
} from "@likelion2026/shared";

import {
  createOfficeCalendarEvent,
  deleteOfficeCalendarEvent,
  getCalendarMemberStatuses,
  getWorkspaceCalendarEvents,
  updateOfficeCalendarEvent
} from "../api/office-calendar";

export type CreateCalendarEventInput = Omit<CreateOfficeCalendarEventRequest, "guestToken">;
export type UpdateCalendarEventInput = Omit<UpdateOfficeCalendarEventRequest, "guestToken">;

export interface OfficeCalendarController {
  createEvent: (input: CreateCalendarEventInput) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  error: string | null;
  events: OfficeCalendarEvent[];
  isLoading: boolean;
  memberStatuses: CalendarMemberStatus[];
  refresh: () => Promise<void>;
  updateEvent: (eventId: string, input: UpdateCalendarEventInput) => Promise<void>;
}

export function useOfficeCalendar(session: GuestOfficeSessionResponse | null): OfficeCalendarController {
  const [events, setEvents] = useState<OfficeCalendarEvent[]>([]);
  const [memberStatuses, setMemberStatuses] = useState<CalendarMemberStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (!session) { setEvents([]); setMemberStatuses([]); setError(null); return; }
    const startsAt = new Date();
    const endsAt = new Date(startsAt); endsAt.setDate(endsAt.getDate() + 31);
    setIsLoading(true); setError(null);
    try {
      const [eventResponse, statusResponse] = await Promise.all([
        getWorkspaceCalendarEvents(session.member.workspaceId, startsAt.toISOString(), endsAt.toISOString()),
        getCalendarMemberStatuses(session.member.workspaceId, startsAt.toISOString())
      ]);
      setEvents(eventResponse.events); setMemberStatuses(statusResponse.statuses);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "공유 일정을 불러오지 못했습니다.");
    } finally { setIsLoading(false); }
  }, [session]);
  useEffect(() => { void refresh(); }, [refresh]);
  const createEvent = useCallback(async (input: CreateCalendarEventInput) => {
    if (!session) throw new Error("오피스 세션이 준비되지 않았습니다.");
    await createOfficeCalendarEvent(session.member.id, { ...input, guestToken: session.guestToken });
    await refresh();
  }, [refresh, session]);
  const updateEvent = useCallback(async (eventId: string, input: UpdateCalendarEventInput) => {
    if (!session) throw new Error("오피스 세션이 준비되지 않았습니다.");
    await updateOfficeCalendarEvent(eventId, { ...input, guestToken: session.guestToken });
    await refresh();
  }, [refresh, session]);
  const deleteEvent = useCallback(async (eventId: string) => {
    if (!session) throw new Error("오피스 세션이 준비되지 않았습니다.");
    await deleteOfficeCalendarEvent(eventId, session.guestToken);
    await refresh();
  }, [refresh, session]);
  return useMemo(() => ({ createEvent, deleteEvent, error, events, isLoading, memberStatuses, refresh, updateEvent }), [createEvent, deleteEvent, error, events, isLoading, memberStatuses, refresh, updateEvent]);
}
