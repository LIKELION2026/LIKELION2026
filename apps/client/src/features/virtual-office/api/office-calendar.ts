import type {
  CalendarEventListResponse,
  CalendarMemberStatusListResponse,
  CreateOfficeCalendarEventRequest,
  UpdateOfficeCalendarEventRequest
} from "@likelion2026/shared";

import { SERVER_URL } from "../../../shared/config/environment";

export async function createOfficeCalendarEvent(
  memberId: string,
  request: CreateOfficeCalendarEventRequest
): Promise<CalendarEventListResponse> {
  return requestCalendar<CalendarEventListResponse>(`/office/members/${memberId}/calendar-events`, {
    body: JSON.stringify(request),
    method: "POST"
  });
}

export async function getWorkspaceCalendarEvents(
  workspaceId: string,
  startsAt: string,
  endsAt: string
): Promise<CalendarEventListResponse> {
  return requestCalendar<CalendarEventListResponse>(
    `/office/workspaces/${workspaceId}/calendar-events?${new URLSearchParams({ endsAt, startsAt })}`
  );
}

export async function getCalendarMemberStatuses(
  workspaceId: string,
  at: string
): Promise<CalendarMemberStatusListResponse> {
  return requestCalendar<CalendarMemberStatusListResponse>(
    `/office/workspaces/${workspaceId}/calendar-statuses?${new URLSearchParams({ at })}`
  );
}

export async function updateOfficeCalendarEvent(
  eventId: string,
  request: UpdateOfficeCalendarEventRequest
): Promise<CalendarEventListResponse> {
  return requestCalendar<CalendarEventListResponse>(`/office/calendar-events/${eventId}`, {
    body: JSON.stringify(request),
    method: "PATCH"
  });
}

export async function deleteOfficeCalendarEvent(eventId: string, guestToken: string): Promise<void> {
  await requestCalendar<void>(
    `/office/calendar-events/${eventId}?${new URLSearchParams({ guestToken })}`,
    { method: "DELETE" }
  );
}

async function requestCalendar<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${SERVER_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers }
  });
  if (!response.ok) throw new Error("공유 일정을 불러오지 못했습니다.");
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}
