import type {
  AttendanceStatus,
  OfficeCollaborationPresence
} from "../../domain/collaboration";
import type { OfficeAvatarState } from "../../domain/member";

export interface OfficeAttendanceUpdatePayload {
  attendanceStatus: AttendanceStatus;
  statusMessage?: string;
}

export interface OfficeHeartbeatPayload {
  avatar?: OfficeAvatarState;
}

export interface OfficeLifecycleUpdatedPayload {
  memberId: string;
  occurredAt: string;
  presence: OfficeCollaborationPresence;
  teamId: string;
}

export interface OfficeTodosUpdatedPayload {
  memberId: string;
  occurredAt: string;
  teamId: string;
}
