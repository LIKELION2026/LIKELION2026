import { useState } from "react";
import type { FormEvent, JSX } from "react";

import { createMeetingToken } from "../../features/realtime-meeting/api/create-meeting-token";
import { getDevelopmentIdentity } from "../../shared/lib/development-identity";

export function MeetingLabPage(): JSX.Element {
  const identity = getDevelopmentIdentity();
  const [roomName, setRoomName] = useState("demo-meeting-room");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await createMeetingToken({
        participantIdentity: identity.memberId,
        participantName: identity.displayName,
        preferredLanguage: identity.language,
        roomName
      });
      setMessage(`${response.roomName} 토큰을 받았습니다. 만료 시각: ${new Date(response.expiresAt).toLocaleTimeString()}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="meeting-lab-page">
      <div className="meeting-lab-card">
        <h1>Meeting Lab</h1>
        <p>
          현재 토큰 API 연결을 확인하는 공간입니다. 영상·음성·번역 자막 UI는 Realtime Meeting 담당자가 이 경로에 이어서 구현합니다.
        </p>
        <form className="meeting-lab-form" onSubmit={handleSubmit}>
          <label>
            회의방 이름
            <input
              maxLength={64}
              onChange={(event) => setRoomName(event.target.value)}
              pattern="[A-Za-z0-9_-]{3,64}"
              required
              value={roomName}
            />
          </label>
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
