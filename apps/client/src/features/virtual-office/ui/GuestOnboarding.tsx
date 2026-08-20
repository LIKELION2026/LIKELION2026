import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { FormEvent, JSX } from "react";
import type { OfficeAvatarId } from "@likelion2026/shared";
import { useTranslation } from "react-i18next";

import {
  getGuestLanguageByCountryCode,
  type GuestProfile
} from "../../../shared/lib/development-identity";
import { DEFAULT_UI_LOCALE, useUiLocale } from "../../../shared/i18n";
import { RequestSpinner } from "../../../app/request-feedback";
import { getGuestAvatarAvailability } from "../api/get-guest-avatar-availability";
import { getAvatarSpriteDefinitions } from "../core/avatar-sprite-definition";
import { AvatarFace } from "./AvatarFace";

interface GuestOnboardingProps {
  error: string | null;
  isLanguageStepComplete: boolean;
  isSubmitting: boolean;
  onLanguageStepComplete: () => void;
  onSubmit: (profile: GuestProfile) => void;
}

export function GuestOnboarding({
  error,
  isLanguageStepComplete,
  isSubmitting,
  onLanguageStepComplete,
  onSubmit
}: GuestOnboardingProps): JSX.Element {
  const { t } = useTranslation();
  const { locale, options: uiLocaleOptions, setLocale } = useUiLocale();
  const [displayName, setDisplayName] = useState("");
  const [countryCode, setCountryCode] = useState<GuestProfile["countryCode"]>("KR");
  const [availableAvatarIds, setAvailableAvatarIds] = useState<OfficeAvatarId[] | null>(null);
  const [hasAvailabilityError, setHasAvailabilityError] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState<OfficeAvatarId | null>(null);
  const [hasSelectionError, setHasSelectionError] = useState(false);
  const avatarDefinitions = useMemo(() => getAvatarSpriteDefinitions(), []);

  useLayoutEffect(() => {
    if (!isLanguageStepComplete && locale !== DEFAULT_UI_LOCALE) {
      setLocale(DEFAULT_UI_LOCALE);
    }
  }, [isLanguageStepComplete, locale, setLocale]);

  const refreshAvatarAvailability = useCallback(async () => {
    try {
      const availability = await getGuestAvatarAvailability();
      setAvailableAvatarIds(availability.availableAvatarIds);
      setSelectedAvatarId((currentAvatarId) =>
        currentAvatarId && availability.availableAvatarIds.includes(currentAvatarId)
          ? currentAvatarId
          : null
      );
      setHasAvailabilityError(false);
    } catch (availabilityRequestError) {
      setHasAvailabilityError(true);
    }
  }, []);

  useEffect(() => {
    if (!isLanguageStepComplete) {
      return;
    }

    void refreshAvatarAvailability();
  }, [refreshAvatarAvailability, error, isLanguageStepComplete]);

  const handleLanguageSelect = (nextLocale: typeof locale) => {
    setLocale(nextLocale);
    onLanguageStepComplete();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = displayName.trim();
    if (!name) {
      return;
    }

    if (!selectedAvatarId) {
      setHasSelectionError(true);
      return;
    }

    onSubmit({
      avatarId: selectedAvatarId,
      countryCode,
      displayName: name,
      language: getGuestLanguageByCountryCode(countryCode)
    });
  };

  const selectRandomAvatar = () => {
    if (!availableAvatarIds || availableAvatarIds.length === 0) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableAvatarIds.length);
    setSelectedAvatarId(availableAvatarIds[randomIndex]!);
    setHasSelectionError(false);
  };

  return (
    <div className="guest-onboarding-backdrop" role="presentation">
      <section
        aria-label={t("guestOnboarding.ariaLabel")}
        aria-labelledby={isLanguageStepComplete ? "guest-onboarding-title" : undefined}
        className={`guest-onboarding${isLanguageStepComplete ? "" : " language-step"}`}
      >
        {isLanguageStepComplete ? (
          <>
            <p className="guest-onboarding-eyebrow">GLOBAL OFFICE</p>
            <h1 id="guest-onboarding-title">{t("guestOnboarding.title")}</h1>
            <p className="guest-onboarding-description">
              {t("guestOnboarding.description")}
            </p>
          </>
        ) : null}
        {!isLanguageStepComplete ? (
          <fieldset className="guest-language-fieldset">
            <legend>{t("guestOnboarding.uiLanguage.legend")}</legend>
            <div className="guest-language-options">
              {uiLocaleOptions.map((option) => (
                <button
                  aria-label={t("guestOnboarding.uiLanguage.optionAria", {
                    language: option.label
                  })}
                  aria-pressed={locale === option.code}
                  className={locale === option.code ? "selected" : undefined}
                  key={option.code}
                  onClick={() => handleLanguageSelect(option.code)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="guest-onboarding-label" htmlFor="guest-name">
              {t("guestOnboarding.name.label")}
            </label>
            <input
              autoComplete="name"
              disabled={isSubmitting}
              id="guest-name"
              maxLength={40}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={t("guestOnboarding.name.placeholder")}
              required
              value={displayName}
            />
            <fieldset className="guest-country-fieldset">
              <legend>{t("guestOnboarding.country.legend")}</legend>
              <div className="guest-country-options">
                <button
                  aria-pressed={countryCode === "KR"}
                  className={countryCode === "KR" ? "selected" : undefined}
                  disabled={isSubmitting}
                onClick={() => setCountryCode("KR")}
                type="button"
              >
                <span aria-hidden="true" className="guest-country-flag">🇰🇷</span>
                {t("guestOnboarding.country.korea")}
                </button>
                <button
                  aria-pressed={countryCode === "VN"}
                  className={countryCode === "VN" ? "selected" : undefined}
                  disabled={isSubmitting}
                onClick={() => setCountryCode("VN")}
                type="button"
              >
                <span aria-hidden="true" className="guest-country-flag">🇻🇳</span>
                {t("guestOnboarding.country.vietnam")}
                </button>
              </div>
            </fieldset>
            <fieldset className="guest-avatar-fieldset">
              <legend>{t("guestOnboarding.avatar.legend")}</legend>
              <div className="guest-avatar-heading">
                <span>{t("guestOnboarding.avatar.help")}</span>
                <button
                  className="guest-avatar-random"
                  disabled={isSubmitting || !availableAvatarIds?.length}
                  onClick={selectRandomAvatar}
                  type="button"
                >
                  {t("guestOnboarding.avatar.random")}
                </button>
              </div>
              <div aria-busy={availableAvatarIds === null} className="guest-avatar-options">
                {avatarDefinitions.map((avatar) => {
                  const isAvailable =
                    availableAvatarIds?.includes(avatar.id as OfficeAvatarId) ?? false;
                  const isSelected = selectedAvatarId === avatar.id;
                  return (
                    <button
                      aria-pressed={isSelected}
                      className={`guest-avatar-option${isSelected ? " selected" : ""}`}
                      disabled={isSubmitting || !isAvailable}
                      key={avatar.id}
                      onClick={() => {
                        setSelectedAvatarId(avatar.id as OfficeAvatarId);
                        setHasSelectionError(false);
                      }}
                      type="button"
                    >
                      <span aria-hidden="true" className="guest-avatar-preview">
                        <AvatarFace avatarId={avatar.id} size={56} />
                      </span>
                      <span>{t(avatar.labelKey)}</span>
                      {!isAvailable ? <small>{t("guestOnboarding.avatar.inUse")}</small> : null}
                    </button>
                  );
                })}
              </div>
              {hasAvailabilityError ? (
                <p className="guest-onboarding-error">
                  {t("guestOnboarding.errors.avatarAvailability")}
                </p>
              ) : null}
              {hasSelectionError ? (
                <p className="guest-onboarding-error">
                  {t("guestOnboarding.errors.avatarRequired")}
                </p>
              ) : null}
            </fieldset>
            {error ? <p className="guest-onboarding-error">{error}</p> : null}
            <button className="guest-onboarding-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? (
                <>
                  <RequestSpinner />
                  {t("guestOnboarding.submit.submitting")}
                </>
              ) : (
                t("guestOnboarding.submit.ready")
              )}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
