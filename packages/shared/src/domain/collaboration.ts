import type { LanguageCode } from "./language";
import type { OfficeAvatarState } from "./member";

export const COUNTRY_CODES = ["KR", "VN"] as const;

export type CountryCode = (typeof COUNTRY_CODES)[number];

export const DESK_ZONE_VALUES = [
  "shared-office",
  "korea-zone",
  "vietnam-zone",
  "meeting-room",
  "focus-room"
] as const;

export type DeskZone = (typeof DESK_ZONE_VALUES)[number];

export const CONNECTION_STATUS_VALUES = ["connected", "disconnected"] as const;

export type ConnectionStatus = (typeof CONNECTION_STATUS_VALUES)[number];

export const ATTENDANCE_STATUS_VALUES = ["working", "checked_out"] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUS_VALUES)[number];

export const AVAILABILITY_STATUS_VALUES = [
  "available",
  "focus",
  "meeting",
  "vacation",
  "remote_work",
  "absent"
] as const;

export type AvailabilityStatus = (typeof AVAILABILITY_STATUS_VALUES)[number];

export const AVATAR_DISPLAY_MODE_VALUES = [
  "active",
  "sleeping",
  "ghost",
  "vacation",
  "remote"
] as const;

export type AvatarDisplayMode = (typeof AVATAR_DISPLAY_MODE_VALUES)[number];

export const TODO_STATUS_VALUES = [
  "planned",
  "in_progress",
  "done",
  "blocked"
] as const;

export type TodoStatus = (typeof TODO_STATUS_VALUES)[number];

export const CALENDAR_EVENT_TYPE_VALUES = [
  "vacation",
  "remote_work",
  "absence",
  "meeting",
  "focus"
] as const;

export type CalendarEventType = (typeof CALENDAR_EVENT_TYPE_VALUES)[number];

export interface OfficeMember {
  avatarId: string;
  countryCode: CountryCode;
  guestToken: string;
  id: string;
  name: string;
  preferredLanguage: LanguageCode;
  workspaceId: string;
}

export interface OfficeDesk {
  assignedMemberId?: string;
  id: string;
  label: string;
  positionX: number;
  positionY: number;
  workspaceId: string;
  zone: DeskZone;
}

export interface OfficeCollaborationPresence {
  attendanceStatus: AttendanceStatus;
  availabilityStatus: AvailabilityStatus;
  avatar: OfficeAvatarState;
  checkedInAt?: string;
  checkedOutAt?: string;
  connectionStatus: ConnectionStatus;
  currentDeskId?: string;
  disconnectedAt?: string;
  displayMode: AvatarDisplayMode;
  lastActiveAt?: string;
  lastHeartbeatAt?: string;
  memberId: string;
  statusMessage?: string;
  updatedAt: string;
}

export interface OfficeTodo {
  id: string;
  isPublic: boolean;
  memberId: string;
  sortOrder: number;
  status: TodoStatus;
  title: string;
}

export interface PublicOfficeTodo extends OfficeTodo {
  memberName: string;
}

export interface OfficeCalendarEvent {
  createdByMemberId?: string;
  endsAt: string;
  eventType: CalendarEventType;
  id: string;
  isAllDay: boolean;
  location?: string;
  participantMemberIds: string[];
  startsAt: string;
  title: string;
  workspaceId: string;
}

export interface CalendarMemberStatus {
  availabilityStatus: AvailabilityStatus;
  displayMode: AvatarDisplayMode;
  endsAt: string;
  eventId: string;
  eventType: CalendarEventType;
  memberId: string;
}
