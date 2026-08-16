import {
  COUNTRY_CODES,
  MEETING_PARTICIPANT_COUNTRIES,
  MEETING_PARTICIPANT_LANGUAGE_BY_COUNTRY,
  type CountryCode,
  type LanguageCode,
  type MeetingParticipantCountry
} from "@likelion2026/shared";

const MEMBER_ID_STORAGE_KEY = "virtual-office.member-id";
const GUEST_PROFILE_STORAGE_KEY = "virtual-office.guest-profile";
const LEGACY_PROFILE_STORAGE_KEY = "virtual-office.development-profile";
const DEFAULT_DISPLAY_NAME = "Guest Member";
const DEFAULT_COUNTRY_CODE: CountryCode = "KR";
const DEFAULT_PARTICIPANT_COUNTRY: MeetingParticipantCountry = "kr";
const DEFAULT_TEAM_ID = "demo-global-team";

export interface GuestProfile {
  countryCode: CountryCode;
  displayName: string;
  language: LanguageCode;
}

export interface DevelopmentProfile {
  displayName: string;
  participantCountry: MeetingParticipantCountry;
}

export interface DevelopmentIdentity {
  countryCode: CountryCode;
  displayName: string;
  language: LanguageCode;
  memberId: string;
  participantCountry: MeetingParticipantCountry;
  teamId: string;
}

export function getStoredGuestProfile(): GuestProfile | null {
  const rawProfile = window.localStorage.getItem(GUEST_PROFILE_STORAGE_KEY);
  if (!rawProfile) {
    return null;
  }

  try {
    return normalizeGuestProfile(JSON.parse(rawProfile) as Partial<GuestProfile>);
  } catch {
    return null;
  }
}

export function saveGuestProfile(profile: GuestProfile): void {
  const normalizedProfile = normalizeGuestProfile(profile) ?? getDefaultGuestProfile();
  window.localStorage.setItem(
    GUEST_PROFILE_STORAGE_KEY,
    JSON.stringify(normalizedProfile)
  );
}

export function getDevelopmentIdentity(): DevelopmentIdentity {
  return toDevelopmentIdentity(getDevelopmentProfile());
}

export function getDevelopmentProfile(): DevelopmentProfile {
  const query = new URLSearchParams(window.location.search);
  const storedGuestProfile = getStoredGuestProfile();
  const legacyProfile = readLegacyDevelopmentProfile();
  const profile = normalizeDevelopmentProfile({
    displayName:
      query.get("name") ??
      storedGuestProfile?.displayName ??
      legacyProfile?.displayName,
    participantCountry:
      normalizeParticipantCountry(query.get("country")) ??
      getParticipantCountryFromLanguage(query.get("lang")) ??
      (storedGuestProfile
        ? countryCodeToParticipantCountry(storedGuestProfile.countryCode)
        : undefined) ??
      legacyProfile?.participantCountry
  });

  if (
    query.has("name") ||
    query.has("country") ||
    query.has("lang") ||
    (!storedGuestProfile && legacyProfile)
  ) {
    writeDevelopmentProfile(profile);
  }

  return profile;
}

export function saveDevelopmentProfile(
  profile: Partial<DevelopmentProfile>
): DevelopmentProfile {
  const savedProfile = normalizeDevelopmentProfile(profile);
  writeDevelopmentProfile(savedProfile);
  return savedProfile;
}

function toDevelopmentIdentity(profile: DevelopmentProfile): DevelopmentIdentity {
  const countryCode = participantCountryToCountryCode(profile.participantCountry);

  return {
    countryCode,
    displayName: profile.displayName,
    language: MEETING_PARTICIPANT_LANGUAGE_BY_COUNTRY[profile.participantCountry],
    memberId: getMemberId(),
    participantCountry: profile.participantCountry,
    teamId: DEFAULT_TEAM_ID
  };
}

function readLegacyDevelopmentProfile():
  | Partial<DevelopmentProfile>
  | undefined {
  const storedValue = window.localStorage.getItem(LEGACY_PROFILE_STORAGE_KEY);
  if (!storedValue) {
    return undefined;
  }

  try {
    const parsedValue = JSON.parse(storedValue) as Partial<DevelopmentProfile>;
    return {
      displayName: parsedValue.displayName,
      participantCountry: normalizeParticipantCountry(
        parsedValue.participantCountry
      )
    };
  } catch {
    return undefined;
  }
}

function writeDevelopmentProfile(profile: DevelopmentProfile): void {
  saveGuestProfile(developmentProfileToGuestProfile(profile));
  window.localStorage.setItem(
    LEGACY_PROFILE_STORAGE_KEY,
    JSON.stringify(profile)
  );
}

function normalizeDevelopmentProfile(
  profile: Partial<DevelopmentProfile>
): DevelopmentProfile {
  const displayName = profile.displayName?.trim() || DEFAULT_DISPLAY_NAME;
  const participantCountry =
    normalizeParticipantCountry(profile.participantCountry) ??
    DEFAULT_PARTICIPANT_COUNTRY;

  return {
    displayName,
    participantCountry
  };
}

function normalizeGuestProfile(
  profile: Partial<GuestProfile>
): GuestProfile | null {
  const countryCode = normalizeCountryCode(profile.countryCode);
  const displayName =
    typeof profile.displayName === "string" ? profile.displayName.trim() : "";

  if (!countryCode || !displayName) {
    return null;
  }

  return {
    countryCode,
    displayName,
    language: getLanguageByCountryCode(countryCode)
  };
}

function developmentProfileToGuestProfile(
  profile: DevelopmentProfile
): GuestProfile {
  const countryCode = participantCountryToCountryCode(profile.participantCountry);

  return {
    countryCode,
    displayName: profile.displayName,
    language: getLanguageByCountryCode(countryCode)
  };
}

function getDefaultGuestProfile(): GuestProfile {
  return {
    countryCode: DEFAULT_COUNTRY_CODE,
    displayName: DEFAULT_DISPLAY_NAME,
    language: getLanguageByCountryCode(DEFAULT_COUNTRY_CODE)
  };
}

function normalizeCountryCode(
  value: string | undefined | null
): CountryCode | undefined {
  if (!value) {
    return undefined;
  }

  const normalizedValue = value.trim().toUpperCase();
  if (COUNTRY_CODES.includes(normalizedValue as CountryCode)) {
    return normalizedValue as CountryCode;
  }

  return undefined;
}

function normalizeParticipantCountry(
  value: string | undefined | null
): MeetingParticipantCountry | undefined {
  if (!value) {
    return undefined;
  }

  const normalizedValue = value.trim().toLowerCase();
  if (
    MEETING_PARTICIPANT_COUNTRIES.includes(
      normalizedValue as MeetingParticipantCountry
    )
  ) {
    return normalizedValue as MeetingParticipantCountry;
  }

  return undefined;
}

function countryCodeToParticipantCountry(
  countryCode: CountryCode
): MeetingParticipantCountry {
  return normalizeParticipantCountry(countryCode) ?? DEFAULT_PARTICIPANT_COUNTRY;
}

function participantCountryToCountryCode(
  participantCountry: MeetingParticipantCountry
): CountryCode {
  return participantCountry === "vn" ? "VN" : "KR";
}

function getLanguageByCountryCode(countryCode: CountryCode): LanguageCode {
  return MEETING_PARTICIPANT_LANGUAGE_BY_COUNTRY[
    countryCodeToParticipantCountry(countryCode)
  ];
}

function getParticipantCountryFromLanguage(
  value: string | null
): MeetingParticipantCountry | undefined {
  const normalizedValue = value?.trim().toLowerCase();
  if (normalizedValue === "vi") {
    return "vn";
  }

  if (normalizedValue === "ko") {
    return "kr";
  }

  return undefined;
}

function getMemberId(): string {
  const existing = window.sessionStorage.getItem(MEMBER_ID_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const memberId = `member-${window.crypto.randomUUID()}`;
  window.sessionStorage.setItem(MEMBER_ID_STORAGE_KEY, memberId);
  return memberId;
}
