import { useCallback, useMemo, useState } from "react";
import type { FormEvent, JSX } from "react";
import {
  MEETING_PARTICIPANT_COUNTRIES,
  type MeetingParticipantCountry
} from "@likelion2026/shared";
import { useTranslation } from "react-i18next";

import { resolveMeetingRoomSection } from "../../features/realtime-meeting/model/meeting-room-section";
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
import { formatDateTime, useUiLocale } from "../../shared/i18n";

export function MeetingLabPage(): JSX.Element {
  const { t } = useTranslation();
  const { locale } = useUiLocale();
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
        t("meetingLab.connectedMessage", {
          expiresAt: formatDateTime(response.expiresAt, locale, {
            hour: "2-digit",
            minute: "2-digit"
          }),
          roomName: response.roomName
        })
      );
      return;
    }

    setError(null);
  };

  return (
    <section className="meeting-lab-page">
      <div className="meeting-lab-card">
        <h1>{t("meetingLab.title")}</h1>
        <p>{t("meetingLab.description")}</p>
        <form className="meeting-lab-form" onSubmit={handleSubmit}>
          <label>
            {t("meetingLab.form.userName")}
            <input
              autoComplete="name"
              maxLength={40}
              onChange={(event) => setDisplayName(event.target.value)}
              required
              value={displayName}
            />
          </label>
          <label>
            {t("meetingLab.country")}
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
                  {t(
                    country === "vn"
                      ? "guestOnboarding.country.vietnam"
                      : "guestOnboarding.country.korea"
                  )}
                </option>
              ))}
            </select>
          </label>
          <div className="meeting-room-preview">
            <span>{t("meetingLab.meetingSection")}</span>
            <strong>{t(roomSection.labelKey)}</strong>
            <code>{roomSection.roomName}</code>
          </div>
          <div className="meeting-device-preflight" aria-live="polite">
            <div className="meeting-device-preflight-row">
              <div>
                <span className="meeting-device-preflight-label">
                  {t("meetingDevicePreflight.cameraMicrophone")}
                </span>
                <strong
                  className={`meeting-device-status ${devicePreflight.status}`}
                >
                  {t(`meetingDevicePreflight.status.${devicePreflight.status}`)}
                </strong>
              </div>
              <button
                className="secondary-button"
                disabled={isCheckingDevices}
                onClick={handleDevicePreflight}
                type="button"
              >
                {isCheckingDevices
                  ? t("meetingDevicePreflight.checkingButton")
                  : t("meetingDevicePreflight.check")}
              </button>
            </div>
            <p>{t(devicePreflight.messageKey)}</p>
            {devicePreflight.status === "ready" ? (
              <div className="meeting-device-counts">
                <span>{t("meetingLab.deviceCounts.camera", { count: devicePreflight.videoInputCount })}</span>
                <span>{t("meetingLab.deviceCounts.mic", { count: devicePreflight.audioInputCount })}</span>
              </div>
            ) : null}
          </div>
          <button
            className="primary-button"
            disabled={isSessionBusy}
            type="submit"
          >
            {isSessionBusy ? t("meetingLab.form.connecting") : t("meetingLab.form.connect")}
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
            <span>{t("meetingLab.liveKitStatus")}</span>
            <strong className={`meeting-session-state ${session.status}`}>
              {t(`meetingSessionStatus.${session.status}`)}
            </strong>
          </div>
          {session.roomName ? <code>{session.roomName}</code> : null}
          {session.participantIdentity ? (
            <p>{t("meetingLab.participantId", { participantId: session.participantIdentity })}</p>
          ) : null}
          {session.status === "connected" ? (
            <div className="meeting-device-counts">
              <span>{t("meetingLab.publishedCounts.camera", { count: session.videoTrackCount })}</span>
              <span>{t("meetingLab.publishedCounts.mic", { count: session.audioTrackCount })}</span>
              <span>{t("meetingLab.publishedCounts.remoteParticipants", { count: session.remoteParticipantCount })}</span>
            </div>
          ) : null}
          {session.errorMessage ? (
            <p className="meeting-session-error">{translateMaybeKey(t, session.errorMessage)}</p>
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
              {t("meetingLab.leave")}
            </button>
          ) : null}
        </div>
        {message ? <div className="result-message">{message}</div> : null}
        {error || meetingController.errorMessage ? (
          <div className="error-message">
            {translateMaybeKey(t, error ?? meetingController.errorMessage ?? "")}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function translateMaybeKey(
  t: (key: string, options?: Record<string, unknown>) => string,
  value: string
): string {
  return /^[a-z][\w-]*(?:\.[\w-]+)+$/.test(value) ? t(value) : value;
}
