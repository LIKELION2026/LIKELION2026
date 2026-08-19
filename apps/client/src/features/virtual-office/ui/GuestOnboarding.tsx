import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, JSX } from "react";
import type { OfficeAvatarId } from "@likelion2026/shared";

import type { GuestProfile } from "../../../shared/lib/development-identity";
import { RequestSpinner } from "../../../app/request-feedback";
import { getGuestAvatarAvailability } from "../api/get-guest-avatar-availability";
import { getAvatarSpriteDefinitions } from "../core/avatar-sprite-definition";
import { AvatarFace } from "./AvatarFace";

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
  const [availableAvatarIds, setAvailableAvatarIds] = useState<OfficeAvatarId[] | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [selectedAvatarId, setSelectedAvatarId] = useState<OfficeAvatarId | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const avatarDefinitions = useMemo(() => getAvatarSpriteDefinitions(), []);

  const refreshAvatarAvailability = useCallback(async () => {
    try {
      const availability = await getGuestAvatarAvailability();
      setAvailableAvatarIds(availability.availableAvatarIds);
      setSelectedAvatarId((currentAvatarId) =>
        currentAvatarId && availability.availableAvatarIds.includes(currentAvatarId)
          ? currentAvatarId
          : null
      );
      setAvailabilityError(null);
    } catch (availabilityRequestError) {
      setAvailabilityError(
        availabilityRequestError instanceof Error
          ? availabilityRequestError.message
          : "사용 가능한 아바타를 불러오지 못했습니다."
      );
    }
  }, []);

  useEffect(() => {
    void refreshAvatarAvailability();
  }, [refreshAvatarAvailability, error]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = displayName.trim();
    if (!name) {
      return;
    }

    if (!selectedAvatarId) {
      setSelectionError("아바타를 선택하거나 랜덤 선택을 눌러주세요.");
      return;
    }

    onSubmit({
      avatarId: selectedAvatarId,
      countryCode,
      displayName: name,
      language: countryCode === "KR" ? "ko" : "vi"
    });
  };

  const selectRandomAvatar = () => {
    if (!availableAvatarIds || availableAvatarIds.length === 0) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableAvatarIds.length);
    setSelectedAvatarId(availableAvatarIds[randomIndex]!);
    setSelectionError(null);
  };

  return (
    <div className="guest-onboarding-backdrop" role="presentation">
      <section aria-labelledby="guest-onboarding-title" className="guest-onboarding">
        <p className="guest-onboarding-eyebrow">GLOBAL OFFICE</p>
        <h1 id="guest-onboarding-title">함께 일할 오피스에 입장합니다</h1>
        <p className="guest-onboarding-description">
          이름, 소속 국가, 사용할 아바타를 선택하면 개인 데스크가 배정됩니다.
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
          <fieldset className="guest-avatar-fieldset">
            <legend>아바타 선택</legend>
            <div className="guest-avatar-heading">
              <span>이미 사용 중인 아바타는 선택할 수 없습니다.</span>
              <button
                className="guest-avatar-random"
                disabled={isSubmitting || !availableAvatarIds?.length}
                onClick={selectRandomAvatar}
                type="button"
              >
                랜덤 선택
              </button>
            </div>
            <div aria-busy={availableAvatarIds === null} className="guest-avatar-options">
              {avatarDefinitions.map((avatar) => {
                const isAvailable = availableAvatarIds?.includes(avatar.id as OfficeAvatarId) ?? false;
                const isSelected = selectedAvatarId === avatar.id;
                return (
                  <button
                    aria-pressed={isSelected}
                    className={`guest-avatar-option${isSelected ? " selected" : ""}`}
                    disabled={isSubmitting || !isAvailable}
                    key={avatar.id}
                    onClick={() => {
                      setSelectedAvatarId(avatar.id as OfficeAvatarId);
                      setSelectionError(null);
                    }}
                    type="button"
                  >
                    <AvatarFace avatarId={avatar.id} size={48} />
                    <span>{avatar.label}</span>
                    {!isAvailable ? <small>사용 중</small> : null}
                  </button>
                );
              })}
            </div>
            {availabilityError ? <p className="guest-onboarding-error">{availabilityError}</p> : null}
            {selectionError ? <p className="guest-onboarding-error">{selectionError}</p> : null}
          </fieldset>
          {error ? <p className="guest-onboarding-error">{error}</p> : null}
          <button className="guest-onboarding-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? <><RequestSpinner />오피스 준비 중</> : "오피스 입장"}
          </button>
        </form>
      </section>
    </div>
  );
}
