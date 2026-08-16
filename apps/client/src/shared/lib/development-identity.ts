import type { CountryCode, LanguageCode } from "@likelion2026/shared";

const GUEST_PROFILE_STORAGE_KEY = "virtual-office.guest-profile";

export interface GuestProfile {
  countryCode: CountryCode;
  displayName: string;
  language: LanguageCode;
}

export function getStoredGuestProfile(): GuestProfile | null {
  const rawProfile = window.localStorage.getItem(GUEST_PROFILE_STORAGE_KEY);
  if (!rawProfile) {
    return null;
  }

  try {
    const profile = JSON.parse(rawProfile) as Partial<GuestProfile>;
    if (
      typeof profile.displayName !== "string" ||
      profile.displayName.trim().length === 0 ||
      (profile.countryCode !== "KR" && profile.countryCode !== "VN") ||
      (profile.language !== "ko" && profile.language !== "vi")
    ) {
      return null;
    }

    return {
      countryCode: profile.countryCode,
      displayName: profile.displayName.trim(),
      language: profile.language
    };
  } catch {
    return null;
  }
}

export function saveGuestProfile(profile: GuestProfile): void {
  window.localStorage.setItem(GUEST_PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export function getDevelopmentIdentity(): GuestProfile {
  return (
    getStoredGuestProfile() ?? {
      countryCode: "KR",
      displayName: "Guest Member",
      language: "ko"
    }
  );
}
