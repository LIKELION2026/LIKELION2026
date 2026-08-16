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
  occurredAt: string;
}

export interface OfficeLifecycleUpdatedPayload {
  memberId: string;
  occurredAt: string;
  presence: OfficeCollaborationPresence;
  teamId: string;
}
