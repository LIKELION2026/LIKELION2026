import { useState } from "react";
import type { FormEvent, JSX } from "react";

import type { GuestProfile } from "../../../shared/lib/development-identity";

interface GuestOnboardingProps {
  error: string | null;
  isSubmitting: boolean;
  onSubmit: (profile: GuestProfile) => void;
}

export function GuestOnboarding({
  error,
  isSubmitting,
  onSubmit
}: GuestOnboardingProps): JSX.Element {
  const [displayName, setDisplayName] = useState("");
  const [countryCode, setCountryCode] = useState<GuestProfile["countryCode"]>("KR");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = displayName.trim();
    if (!name) {
      return;
    }

    onSubmit({
      countryCode,
      displayName: name,
      language: countryCode === "KR" ? "ko" : "vi"
    });
  };

  return (
    <div className="guest-onboarding-backdrop" role="presentation">
      <section aria-labelledby="guest-onboarding-title" className="guest-onboarding">
        <p className="guest-onboarding-eyebrow">GLOBAL OFFICE</p>
        <h1 id="guest-onboarding-title">함께 일할 오피스에 입장합니다</h1>
        <p className="guest-onboarding-description">
          이름과 소속 국가를 선택하면 아바타와 개인 데스크가 자동으로 배정됩니다.
        </p>
        <form onSubmit={handleSubmit}>
          <label className="guest-onboarding-label" htmlFor="guest-name">
            이름
          </label>
          <input
            autoComplete="name"
            disabled={isSubmitting}
            id="guest-name"
            maxLength={40}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="오피스에서 사용할 이름"
            required
            value={displayName}
          />
          <fieldset className="guest-country-fieldset">
            <legend>소속 국가</legend>
            <div className="guest-country-options">
              <button
                aria-pressed={countryCode === "KR"}
                className={countryCode === "KR" ? "selected" : undefined}
                disabled={isSubmitting}
                onClick={() => setCountryCode("KR")}
                type="button"
              >
                한국
              </button>
              <button
                aria-pressed={countryCode === "VN"}
                className={countryCode === "VN" ? "selected" : undefined}
                disabled={isSubmitting}
                onClick={() => setCountryCode("VN")}
                type="button"
              >
                베트남
              </button>
            </div>
          </fieldset>
          {error ? <p className="guest-onboarding-error">{error}</p> : null}
          <button className="guest-onboarding-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "오피스 준비 중" : "오피스 입장"}
          </button>
        </form>
      </section>
    </div>
  );
}
