import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

export interface OfficeCalendarRange {
  endsAt: string;
  startsAt: string;
}

export interface OfficeCalendarController {
  createEvent: (input: CreateCalendarEventInput) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  error: string | null;
  events: OfficeCalendarEvent[];
  isLoading: boolean;
  memberStatuses: CalendarMemberStatus[];
  refresh: (range?: OfficeCalendarRange) => Promise<void>;
  updateEvent: (eventId: string, input: UpdateCalendarEventInput) => Promise<void>;
}

export function useOfficeCalendar(
  session: GuestOfficeSessionResponse | null
): OfficeCalendarController {
  const [events, setEvents] = useState<OfficeCalendarEvent[]>([]);
  const [memberStatuses, setMemberStatuses] = useState<CalendarMemberStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rangeRef = useRef<OfficeCalendarRange>(getDefaultCalendarRange());

  const refresh = useCallback(async (range?: OfficeCalendarRange) => {
    if (!session) {
      setEvents([]);
      setMemberStatuses([]);
      setError(null);
      return;
    }

    if (range) {
      rangeRef.current = range;
    }
    const { startsAt, endsAt } = rangeRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const [eventResponse, statusResponse] = await Promise.all([
        getWorkspaceCalendarEvents(session.member.workspaceId, startsAt, endsAt),
        getCalendarMemberStatuses(session.member.workspaceId, new Date().toISOString())
      ]);
      setEvents(eventResponse.events);
      setMemberStatuses(statusResponse.statuses);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "officeCalendar.requestFailed"
      );
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createEvent = useCallback(async (input: CreateCalendarEventInput) => {
    if (!session) {
      throw new Error("officeSession.required");
    }

    await createOfficeCalendarEvent(session.member.id, {
      ...input,
      guestToken: session.guestToken
    });
    await refresh();
  }, [refresh, session]);

  const updateEvent = useCallback(async (eventId: string, input: UpdateCalendarEventInput) => {
    if (!session) {
      throw new Error("officeSession.required");
    }

    await updateOfficeCalendarEvent(eventId, { ...input, guestToken: session.guestToken });
    await refresh();
  }, [refresh, session]);

  const deleteEvent = useCallback(async (eventId: string) => {
    if (!session) {
      throw new Error("officeSession.required");
    }

    await deleteOfficeCalendarEvent(eventId, session.guestToken);
    await refresh();
  }, [refresh, session]);

  return useMemo(
    () => ({
      createEvent,
      deleteEvent,
      error,
      events,
      isLoading,
      memberStatuses,
      refresh,
      updateEvent
    }),
    [createEvent, deleteEvent, error, events, isLoading, memberStatuses, refresh, updateEvent]
  );
}

function getDefaultCalendarRange(): OfficeCalendarRange {
  const startsAt = new Date();
  const endsAt = new Date(startsAt);
  endsAt.setDate(endsAt.getDate() + 42);
  return { endsAt: endsAt.toISOString(), startsAt: startsAt.toISOString() };
}
