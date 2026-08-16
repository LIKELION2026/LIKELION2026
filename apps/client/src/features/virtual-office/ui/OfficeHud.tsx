import {
  MEMBER_STATUS_LABELS,
  type AttendanceStatus,
  type MemberStatus
} from "@likelion2026/shared";

import { OFFICE_STATUS_OPTIONS, type OfficeConnectionState } from "../model/office-store";

interface OfficeHudProps {
  connectionState: OfficeConnectionState;
  memberCount: number;
  onAttendanceChange: (attendanceStatus: AttendanceStatus) => void;
  onStatusChange: (status: MemberStatus) => void;
  selfAttendanceStatus: AttendanceStatus | undefined;
  selfStatus: MemberStatus | undefined;
}

export function OfficeHud({
  connectionState,
  memberCount,
  onAttendanceChange,
  onStatusChange,
  selfAttendanceStatus,
  selfStatus
}: OfficeHudProps): React.JSX.Element {
  return (
    <div className="office-hud">
      <section className="hud-panel" aria-label="오피스 상태">
        <p className="hud-title">Demo Global Team</p>
        <p className="hud-meta">현재 오피스 {memberCount}명</p>
        <div className="connection-state">
          <span className={`connection-dot ${connectionState}`} />
          {getConnectionLabel(connectionState)}
        </div>
        <button
          className="attendance-button"
          onClick={() =>
            onAttendanceChange(
              selfAttendanceStatus === "working" ? "checked_out" : "working"
            )
          }
          type="button"
        >
          {selfAttendanceStatus === "working" ? "퇴근하기" : "출근하기"}
        </button>
        <select
          aria-label="내 협업 상태"
          className="status-control"
          onChange={(event) => onStatusChange(event.target.value as MemberStatus)}
          value={selfStatus ?? "available"}
        >
          {OFFICE_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {MEMBER_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </section>
    </div>
  );
}

function getConnectionLabel(state: OfficeConnectionState): string {
  const labels: Record<OfficeConnectionState, string> = {
    connected: "오피스 연결됨",
    connecting: "오피스 연결 중",
    disconnected: "오피스 연결 끊김",
    reconnecting: "오피스 재연결 중"
  };

  return labels[state];
}
