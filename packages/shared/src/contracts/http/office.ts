import type {
  AttendanceStatus,
  AvailabilityStatus,
  CountryCode,
  OfficeCollaborationPresence,
  OfficeDesk,
  OfficeMember
} from "../../domain/collaboration";
import type { LanguageCode } from "../../domain/language";

export interface CreateGuestOfficeSessionRequest {
  countryCode: CountryCode;
  displayName: string;
  guestToken?: string;
  language: LanguageCode;
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
