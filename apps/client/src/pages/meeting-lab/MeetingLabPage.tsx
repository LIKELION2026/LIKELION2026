import { useCallback, useMemo, useState } from "react";
import type { FormEvent, JSX } from "react";
import {
  MEETING_PARTICIPANT_COUNTRIES,
  type MeetingParticipantCountry
} from "@likelion2026/shared";
import { Track } from "livekit-client";

import { createMeetingToken } from "../../features/realtime-meeting/api/create-meeting-token";
import {
  checkMeetingDevicePreflight,
  INITIAL_MEETING_DEVICE_PREFLIGHT_STATE,
  type MeetingDevicePreflightStatus
} from "../../features/realtime-meeting/model/device-preflight";
import { resolveMeetingRoomSection } from "../../features/realtime-meeting/model/meeting-room-section";
import {
  useLiveKitMeetingSession,
  type LiveKitMeetingMediaTrack,
  type LiveKitMeetingSessionStatus
} from "../../features/realtime-meeting/model/use-livekit-meeting-session";
import { useMeetingSubtitles } from "../../features/realtime-meeting/model/use-meeting-subtitles";
import { MeetingMediaTrackElement } from "../../features/realtime-meeting/ui/MeetingMediaTrackElement";
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
  ready: "입장 가능"
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [devicePreflight, setDevicePreflight] = useState(
    INITIAL_MEETING_DEVICE_PREFLIGHT_STATE
  );
  const {
    connect,
    disconnect,
    session,
    setCameraEnabled,
    setMicrophoneEnabled
  } = useLiveKitMeetingSession();
  const isCheckingDevices = devicePreflight.status === "checking";
  const isDeviceReady = devicePreflight.status === "ready";
  const isSessionBusy =
    session.status === "connecting" ||
    session.status === "publishing" ||
    session.status === "reconnecting";
  const canControlMedia =
    session.status === "connected" || session.status === "reconnecting";
  const subtitleState = useMeetingSubtitles(
    canControlMedia ? session.roomName : undefined
  );
  const videoTracks = session.mediaTracks.filter(
    (mediaTrack) => mediaTrack.kind === Track.Kind.Video
  );
  const remoteAudioTracks = session.mediaTracks.filter(
    (mediaTrack) =>
      mediaTrack.kind === Track.Kind.Audio && !mediaTrack.isLocal
  );

  const handleDevicePreflight = useCallback(async () => {
    setError(null);
    setMessage(null);
    setDevicePreflight({
      ...INITIAL_MEETING_DEVICE_PREFLIGHT_STATE,
      message: "카메라와 마이크 권한을 확인하고 있습니다.",
      status: "checking"
    });

    setDevicePreflight(await checkMeetingDevicePreflight());
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isDeviceReady) {
      setError("카메라와 마이크 확인을 먼저 완료해 주세요.");
      return;
    }

    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const savedProfile = saveDevelopmentProfile({
        displayName,
        participantCountry
      });
      const response = await createMeetingToken({
        participantCountry: savedProfile.participantCountry,
        participantName: savedProfile.displayName,
        roomName: roomSection.roomName
      });
      await connect(response);
      setDisplayName(savedProfile.displayName);
      setParticipantCountry(savedProfile.participantCountry);
      setMessage(
        `${response.roomName} 회의방에 연결했습니다. 토큰 만료 시각: ${new Date(
          response.expiresAt
        ).toLocaleTimeString()}`
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
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
            {isDeviceReady ? (
              <div className="meeting-device-counts">
                <span>Camera {devicePreflight.videoInputCount}</span>
                <span>Mic {devicePreflight.audioInputCount}</span>
              </div>
            ) : null}
          </div>
          <button
            className="primary-button"
            disabled={isSubmitting || isSessionBusy || !isDeviceReady}
            type="submit"
          >
            {isSubmitting || isSessionBusy ? "회의 연결 중" : "회의 연결"}
          </button>
        </form>
        <MeetingMediaStage
          canControlMedia={canControlMedia}
          onCameraToggle={() => {
            void setCameraEnabled(!session.isCameraEnabled);
          }}
          onMicrophoneToggle={() => {
            void setMicrophoneEnabled(!session.isMicrophoneEnabled);
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
                void disconnect();
                setMessage(null);
              }}
              type="button"
            >
              회의 나가기
            </button>
          ) : null}
        </div>
        {message ? <div className="result-message">{message}</div> : null}
        {error ? <div className="error-message">{error}</div> : null}
      </div>
    </section>
  );
}

interface MeetingMediaStageProps {
  canControlMedia: boolean;
  onCameraToggle: () => void;
  onMicrophoneToggle: () => void;
  remoteAudioTracks: LiveKitMeetingMediaTrack[];
  session: ReturnType<typeof useLiveKitMeetingSession>["session"];
  videoTracks: LiveKitMeetingMediaTrack[];
}

function MeetingMediaStage({
  canControlMedia,
  onCameraToggle,
  onMicrophoneToggle,
  remoteAudioTracks,
  session,
  videoTracks
}: MeetingMediaStageProps): JSX.Element | null {
  if (session.status === "idle" || session.status === "failed") {
    return null;
  }

  return (
    <div className="meeting-media-stage">
      {videoTracks.length > 0 ? (
        <div className="meeting-media-grid">
          {videoTracks.map((mediaTrack) => (
            <article className="meeting-media-tile" key={mediaTrack.id}>
              <MeetingMediaTrackElement mediaTrack={mediaTrack} />
              <div className="meeting-media-overlay">
                <strong>
                  {mediaTrack.participantName}
                  {mediaTrack.isLocal ? " (나)" : ""}
                </strong>
                <span>
                  {mediaTrack.isMuted ? "카메라 꺼짐" : mediaTrack.source}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="meeting-media-empty">
          아직 표시할 카메라 영상이 없습니다.
        </div>
      )}
      <div className="meeting-audio-sinks" aria-hidden="true">
        {remoteAudioTracks.map((mediaTrack) => (
          <MeetingMediaTrackElement
            key={mediaTrack.id}
            mediaTrack={mediaTrack}
          />
        ))}
      </div>
      <div className="meeting-media-controls">
        <button
          className="secondary-button"
          disabled={!canControlMedia || session.isMicrophoneUpdating}
          onClick={onMicrophoneToggle}
          type="button"
        >
          {session.isMicrophoneEnabled ? "마이크 끄기" : "마이크 켜기"}
        </button>
        <button
          className="secondary-button"
          disabled={!canControlMedia || session.isCameraUpdating}
          onClick={onCameraToggle}
          type="button"
        >
          {session.isCameraEnabled ? "카메라 끄기" : "카메라 켜기"}
        </button>
      </div>
    </div>
  );
}
