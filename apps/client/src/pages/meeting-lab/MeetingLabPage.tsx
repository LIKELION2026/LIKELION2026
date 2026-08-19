import { useCallback, useMemo, useState } from "react";
import type { FormEvent, JSX } from "react";
import {
  MEETING_PARTICIPANT_COUNTRIES,
  type MeetingParticipantCountry
} from "@likelion2026/shared";

import type { MeetingDevicePreflightStatus } from "../../features/realtime-meeting/model/device-preflight";
import { resolveMeetingRoomSection } from "../../features/realtime-meeting/model/meeting-room-section";
import {
  type LiveKitMeetingSessionStatus
} from "../../features/realtime-meeting/model/use-livekit-meeting-session";
import {
  useMeetingSessionController
} from "../../features/realtime-meeting/model/use-meeting-session-controller";
import { useMeetingSubtitles } from "../../features/realtime-meeting/model/use-meeting-subtitles";
import { useMeetingOfficePresence } from "../../features/virtual-office/model/use-meeting-office-presence";
import {
  MeetingMediaStage,
  splitMeetingMediaTracks
} from "../../features/realtime-meeting/ui/MeetingMediaStage";
import { MeetingSubtitlePanel } from "../../features/realtime-meeting/ui/MeetingSubtitlePanel";
import {
  getDevelopmentIdentity,
  saveDevelopmentProfile
} from "../../shared/lib/development-identity";

const COUNTRY_OPTION_LABELS: Record<MeetingParticipantCountry, string> = {
  kr: "한국",
  vn: "베트남"
};

const PREFLIGHT_STATUS_LABELS: Record<MeetingDevicePreflightStatus, string> = {
  checking: "확인 중",
  "device-unavailable": "장치 없음",
  idle: "확인 전",
  "permission-denied": "권한 거부",
  ready: "입장 가능",
  "security-unavailable": "보안 연결 필요"
};

const MEETING_SESSION_STATUS_LABELS: Record<LiveKitMeetingSessionStatus, string> =
  {
    connected: "연결됨",
    connecting: "연결 중",
    disconnected: "연결 종료",
    failed: "연결 실패",
    idle: "대기 중",
    publishing: "트랙 게시 중",
    reconnecting: "재연결 중"
  };

export function MeetingLabPage(): JSX.Element {
  const initialIdentity = useMemo(getDevelopmentIdentity, []);
  const roomSection = useMemo(
    () => resolveMeetingRoomSection(window.location.search),
    []
  );
  const [displayName, setDisplayName] = useState(initialIdentity.displayName);
  const [participantCountry, setParticipantCountry] =
    useState<MeetingParticipantCountry>(initialIdentity.participantCountry);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const meetingController = useMeetingSessionController();
  const { devicePreflight, session } = meetingController;
  useMeetingOfficePresence(session.status);
  const isCheckingDevices = devicePreflight.status === "checking";
  const isSessionBusy =
    meetingController.status === "requesting-permission" ||
    meetingController.status === "connecting" ||
    meetingController.status === "leaving" ||
    session.status === "connecting" ||
    session.status === "publishing" ||
    session.status === "reconnecting";
  const canControlMedia =
    session.status === "connected" || session.status === "reconnecting";
  const subtitleState = useMeetingSubtitles(
    canControlMedia ? session.roomName : undefined
  );
  const { remoteAudioTracks, videoTracks } = splitMeetingMediaTracks(
    session.mediaTracks
  );

  const handleDevicePreflight = useCallback(async () => {
    setError(null);
    setMessage(null);
    await meetingController.checkDevices();
  }, [meetingController]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError(null);
    setMessage(null);

    const savedProfile = saveDevelopmentProfile({
      displayName,
      participantCountry
    });
    const response = await meetingController.start({
      participantCountry: savedProfile.participantCountry,
      participantName: savedProfile.displayName,
      roomName: roomSection.roomName
    });

    if (response) {
      setDisplayName(savedProfile.displayName);
      setParticipantCountry(savedProfile.participantCountry);
      setMessage(
        `${response.roomName} 회의방에 연결했습니다. 토큰 만료 시각: ${new Date(
          response.expiresAt
        ).toLocaleTimeString()}`
      );
      return;
    }

    setError(null);
  };

  return (
    <section className="meeting-lab-page">
      <div className="meeting-lab-card">
        <h1>Meeting Lab</h1>
        <p>LiveKit 입장 정보와 회의 섹션을 확인합니다.</p>
        <form className="meeting-lab-form" onSubmit={handleSubmit}>
          <label>
            사용자 이름
            <input
              autoComplete="name"
              maxLength={40}
              onChange={(event) => setDisplayName(event.target.value)}
              required
              value={displayName}
            />
          </label>
          <label>
            국가
            <select
              onChange={(event) =>
                setParticipantCountry(
                  event.target.value as MeetingParticipantCountry
                )
              }
              value={participantCountry}
            >
              {MEETING_PARTICIPANT_COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {COUNTRY_OPTION_LABELS[country]}
                </option>
              ))}
            </select>
          </label>
          <div className="meeting-room-preview">
            <span>회의 섹션</span>
            <strong>{roomSection.label}</strong>
            <code>{roomSection.roomName}</code>
          </div>
          <div className="meeting-device-preflight" aria-live="polite">
            <div className="meeting-device-preflight-row">
              <div>
                <span className="meeting-device-preflight-label">
                  카메라/마이크
                </span>
                <strong
                  className={`meeting-device-status ${devicePreflight.status}`}
                >
                  {PREFLIGHT_STATUS_LABELS[devicePreflight.status]}
                </strong>
              </div>
              <button
                className="secondary-button"
                disabled={isCheckingDevices}
                onClick={handleDevicePreflight}
                type="button"
              >
                {isCheckingDevices ? "확인 중" : "장치 확인"}
              </button>
            </div>
            <p>{devicePreflight.message}</p>
            {devicePreflight.status === "ready" ? (
              <div className="meeting-device-counts">
                <span>Camera {devicePreflight.videoInputCount}</span>
                <span>Mic {devicePreflight.audioInputCount}</span>
              </div>
            ) : null}
          </div>
          <button
            className="primary-button"
            disabled={isSessionBusy}
            type="submit"
          >
            {isSessionBusy ? "회의 연결 중" : "회의 연결"}
          </button>
        </form>
        <MeetingMediaStage
          canControlMedia={canControlMedia}
          onCameraToggle={() => {
            void meetingController.setCameraEnabled(!session.isCameraEnabled);
          }}
          onMicrophoneToggle={() => {
            void meetingController.setMicrophoneEnabled(
              !session.isMicrophoneEnabled
            );
          }}
          remoteAudioTracks={remoteAudioTracks}
          session={session}
          videoTracks={videoTracks}
        />
        <MeetingSubtitlePanel
          errorMessage={subtitleState.errorMessage}
          status={subtitleState.status}
          subtitles={subtitleState.subtitles}
        />
        <div className="meeting-session-status" aria-live="polite">
          <div>
            <span>LiveKit 상태</span>
            <strong className={`meeting-session-state ${session.status}`}>
              {MEETING_SESSION_STATUS_LABELS[session.status]}
            </strong>
          </div>
          {session.roomName ? <code>{session.roomName}</code> : null}
          {session.participantIdentity ? (
            <p>참가자 ID: {session.participantIdentity}</p>
          ) : null}
          {session.status === "connected" ? (
            <div className="meeting-device-counts">
              <span>Published camera {session.videoTrackCount}</span>
              <span>Published mic {session.audioTrackCount}</span>
              <span>Remote participants {session.remoteParticipantCount}</span>
            </div>
          ) : null}
          {session.errorMessage ? (
            <p className="meeting-session-error">{session.errorMessage}</p>
          ) : null}
          {session.status === "connected" || session.status === "reconnecting" ? (
            <button
              className="secondary-button"
              onClick={() => {
                void meetingController.leave();
                setMessage(null);
              }}
              type="button"
            >
              회의 나가기
            </button>
          ) : null}
        </div>
        {message ? <div className="result-message">{message}</div> : null}
        {error || meetingController.errorMessage ? (
          <div className="error-message">
            {error ?? meetingController.errorMessage}
          </div>
        ) : null}
      </div>
    </section>
  );
}
