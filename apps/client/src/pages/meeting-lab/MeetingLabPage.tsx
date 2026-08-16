import { useMemo, useState } from "react";
import type { FormEvent, JSX } from "react";
import {
  MEETING_PARTICIPANT_COUNTRIES,
  type MeetingParticipantCountry
} from "@likelion2026/shared";

import { createMeetingToken } from "../../features/realtime-meeting/api/create-meeting-token";
import { resolveMeetingRoomSection } from "../../features/realtime-meeting/model/meeting-room-section";
import {
  getDevelopmentIdentity,
  saveDevelopmentProfile
} from "../../shared/lib/development-identity";

const COUNTRY_OPTION_LABELS: Record<MeetingParticipantCountry, string> = {
  kr: "한국",
  vn: "베트남"
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
      setDisplayName(savedProfile.displayName);
      setParticipantCountry(savedProfile.participantCountry);
      setMessage(
        `${response.roomName} 토큰을 받았습니다. 만료 시각: ${new Date(
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
          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "토큰 요청 중" : "토큰 API 확인"}
          </button>
        </form>
        {message ? <div className="result-message">{message}</div> : null}
        {error ? <div className="error-message">{error}</div> : null}
      </div>
    </section>
  );
}
