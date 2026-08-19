import type { JSX } from "react";
import type { MeetingDevicePreflightStatus } from "../model/device-preflight";
import type { LiveKitMeetingSessionStatus } from "../model/use-livekit-meeting-session";
import type {
  MeetingSessionController,
  MeetingSessionJoinRequest
} from "../model/use-meeting-session-controller";
import type { MeetingSessionControllerStatus } from "../model/meeting-session-transition";
import { MeetingSubtitlePanel } from "./MeetingSubtitlePanel";
import { useMeetingSubtitles } from "../model/use-meeting-subtitles";

interface MeetingRoomSessionPanelProps {
  controller: MeetingSessionController;
  isOfficeSessionReady: boolean;
  roomLabel: string;
}

const CONTROLLER_STATUS_LABELS: Record<
  MeetingSessionControllerStatus,
  string
> = {
  connected: "연결됨",
  connecting: "연결 중",
  failed: "연결 실패",
  idle: "대기 중",
  leaving: "정리 중",
  "requesting-permission": "권한 확인 중"
};

const DEVICE_PREFLIGHT_LABELS: Record<MeetingDevicePreflightStatus, string> = {
  checking: "확인 중",
  "device-unavailable": "장치 없음",
  idle: "확인 전",
  "permission-denied": "권한 거부",
  ready: "사용 가능",
  "security-unavailable": "보안 연결 필요"
};

const LIVEKIT_SESSION_STATUS_LABELS: Record<
  LiveKitMeetingSessionStatus,
  string
> = {
  connected: "연결됨",
  connecting: "연결 중",
  disconnected: "연결 종료",
  failed: "연결 실패",
  idle: "대기 중",
  publishing: "트랙 게시 중",
  reconnecting: "재연결 중"
};

export function MeetingRoomSessionPanel({
  controller,
  isOfficeSessionReady,
  roomLabel
}: MeetingRoomSessionPanelProps): JSX.Element {
  const { devicePreflight, session } = controller;
  const canControlMedia =
    session.status === "connected" || session.status === "reconnecting";
  const subtitleState = useMeetingSubtitles(
    canControlMedia ? session.roomName : undefined
  );

  return (
    <section
      aria-label="회의실 연결 상태"
      className="meeting-room-session-panel"
    >
      <div className="meeting-room-session-header">
        <div>
          <h2>{roomLabel}</h2>
          <span>회의실 구역</span>
        </div>
        <strong className={`meeting-session-state ${controller.status}`}>
          {CONTROLLER_STATUS_LABELS[controller.status]}
        </strong>
      </div>
      <p>{getPanelMessage(controller.status, isOfficeSessionReady)}</p>
      <div className="meeting-room-session-status-grid" aria-live="polite">
        <div>
          <span>카메라/마이크</span>
          <strong className={`meeting-device-status ${devicePreflight.status}`}>
            {DEVICE_PREFLIGHT_LABELS[devicePreflight.status]}
          </strong>
        </div>
        <div>
          <span>LiveKit</span>
          <strong className={`meeting-session-state ${session.status}`}>
            {LIVEKIT_SESSION_STATUS_LABELS[session.status]}
          </strong>
        </div>
        {controller.activeJoinRequest ? (
          <div>
            <span>회의방</span>
            <code>{controller.activeJoinRequest.roomName}</code>
          </div>
        ) : null}
      </div>
      {devicePreflight.message ? <p>{devicePreflight.message}</p> : null}
      {devicePreflight.status === "ready" ? (
        <div className="meeting-device-counts">
          <span>Camera {devicePreflight.videoInputCount}</span>
          <span>Mic {devicePreflight.audioInputCount}</span>
        </div>
      ) : null}
      {controller.errorMessage || session.errorMessage ? (
        <p className="meeting-session-error">
          {controller.errorMessage ?? session.errorMessage}
        </p>
      ) : null}
      {controller.status === "failed" &&
      isOfficeSessionReady &&
      canRetry(controller.activeJoinRequest) ? (
        <button
          className="secondary-button"
          onClick={() => {
            void controller.retry();
          }}
          type="button"
        >
          다시 시도
        </button>
      ) : null}
      {canControlMedia ? (
        <MeetingSubtitlePanel
          errorMessage={subtitleState.errorMessage}
          status={subtitleState.status}
          subtitles={subtitleState.subtitles}
        />
      ) : null}
    </section>
  );
}

function getPanelMessage(
  status: MeetingSessionControllerStatus,
  isOfficeSessionReady: boolean
): string {
  if (!isOfficeSessionReady) {
    return "오피스 입장 정보를 준비하면 회의 연결을 시작합니다.";
  }

  if (status === "requesting-permission") {
    return "브라우저 권한 창에서 카메라와 마이크 사용을 허용해 주세요.";
  }

  if (status === "connecting") {
    return "회의방에 연결하고 로컬 카메라와 마이크를 게시하고 있습니다.";
  }

  if (status === "connected") {
    return "오피스 화면을 유지한 채 회의에 연결되었습니다.";
  }

  if (status === "leaving") {
    return "회의 연결과 로컬 미디어를 정리하고 있습니다.";
  }

  if (status === "failed") {
    return "맵 조작은 유지됩니다. 권한이나 연결 상태를 확인한 뒤 다시 시도할 수 있습니다.";
  }

  return "회의 연결을 준비하고 있습니다.";
}

function canRetry(request: MeetingSessionJoinRequest | null): boolean {
  return Boolean(request);
}
