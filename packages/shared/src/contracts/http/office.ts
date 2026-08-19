import type {
  AttendanceStatus,
  AvailabilityStatus,
  CalendarMemberStatus,
  CalendarEventType,
  CountryCode,
  OfficeCollaborationPresence,
  OfficeCalendarEvent,
  OfficeDesk,
  OfficeMember,
  OfficeTodo,
  PublicOfficeTodo,
  TodoStatus
} from "../../domain/collaboration";
import type { OfficeAvatarId } from "../../domain/avatar";
import type { LanguageCode } from "../../domain/language";

export interface CreateGuestOfficeSessionRequest {
  avatarId?: OfficeAvatarId;
  countryCode: CountryCode;
  displayName: string;
  guestToken?: string;
  language: LanguageCode;
}

export interface GuestOfficeAvatarAvailabilityResponse {
  availableAvatarIds: OfficeAvatarId[];
}

export interface GuestOfficeSessionResponse {
  desk: OfficeDesk;
  guestToken: string;
  member: OfficeMember;
  presence: OfficeCollaborationPresence;
}

export interface UpdateOfficeAttendanceRequest {
  attendanceStatus: AttendanceStatus;
  guestToken: string;
  statusMessage?: string;
}

export interface UpdateOfficePresenceRequest {
  availabilityStatus?: AvailabilityStatus;
  guestToken: string;
  positionX?: number;
  positionY?: number;
  statusMessage?: string;
}

export interface CreateOfficeTodoRequest {
  guestToken: string;
  isPublic?: boolean;
  title: string;
}

export interface UpdateOfficeTodoRequest {
  guestToken: string;
  isPublic?: boolean;
  sortOrder?: number;
  status?: TodoStatus;
  title?: string;
}

export interface OfficeTodoListResponse {
  todos: OfficeTodo[];
}

export interface PublicOfficeTodoListResponse {
  todos: PublicOfficeTodo[];
}

export interface CreateOfficeCalendarEventRequest {
  endsAt: string;
  eventType: CalendarEventType;
  guestToken: string;
  isAllDay?: boolean;
  location?: string;
  startsAt: string;
  title: string;
}

export interface UpdateOfficeCalendarEventRequest {
  endsAt?: string;
  eventType?: CalendarEventType;
  guestToken: string;
  isAllDay?: boolean;
  location?: string;
  startsAt?: string;
  title?: string;
}

export interface DeleteOfficeCalendarEventRequest {
  guestToken: string;
}

export interface GetWorkspaceCalendarEventsQuery {
  endsAt: string;
  startsAt: string;
}

export interface CalendarEventListResponse {
  events: OfficeCalendarEvent[];
}

export interface CalendarMemberStatusListResponse {
  statuses: CalendarMemberStatus[];
}
