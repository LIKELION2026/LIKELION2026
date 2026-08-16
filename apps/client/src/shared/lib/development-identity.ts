import {
  MEETING_PARTICIPANT_COUNTRIES,
  MEETING_PARTICIPANT_LANGUAGE_BY_COUNTRY,
  type LanguageCode,
  type MeetingParticipantCountry
} from "@likelion2026/shared";

const MEMBER_ID_STORAGE_KEY = "virtual-office.member-id";
const PROFILE_STORAGE_KEY = "virtual-office.development-profile";
const DEFAULT_DISPLAY_NAME = "Guest Member";
const DEFAULT_PARTICIPANT_COUNTRY: MeetingParticipantCountry = "kr";

export interface DevelopmentProfile {
  displayName: string;
  participantCountry: MeetingParticipantCountry;
}

export interface DevelopmentIdentity {
  displayName: string;
  language: LanguageCode;
  memberId: string;
  participantCountry: MeetingParticipantCountry;
  teamId: string;
}

export function getDevelopmentIdentity(): DevelopmentIdentity {
  return toDevelopmentIdentity(getDevelopmentProfile());
}

export function getDevelopmentProfile(): DevelopmentProfile {
  const query = new URLSearchParams(window.location.search);
  const storedProfile = readStoredDevelopmentProfile();
  const profile = normalizeDevelopmentProfile({
    displayName: query.get("name") ?? storedProfile?.displayName,
    participantCountry:
      normalizeParticipantCountry(query.get("country")) ??
      getParticipantCountryFromLanguage(query.get("lang")) ??
      storedProfile?.participantCountry
  });

  if (query.has("name") || query.has("country") || query.has("lang")) {
    writeStoredDevelopmentProfile(profile);
  }

  return profile;
}

export function saveDevelopmentProfile(
  profile: Partial<DevelopmentProfile>
): DevelopmentProfile {
  const savedProfile = normalizeDevelopmentProfile(profile);
  writeStoredDevelopmentProfile(savedProfile);
  return savedProfile;
}

function toDevelopmentIdentity(profile: DevelopmentProfile): DevelopmentIdentity {
  return {
    ...profile,
    language:
      MEETING_PARTICIPANT_LANGUAGE_BY_COUNTRY[profile.participantCountry],
    memberId: getMemberId(),
    teamId: "demo-global-team"
  };
}

function readStoredDevelopmentProfile(): Partial<DevelopmentProfile> | undefined {
  const storedValue = window.localStorage.getItem(PROFILE_STORAGE_KEY);
  if (!storedValue) {
    return undefined;
  }

  try {
    const parsedValue = JSON.parse(storedValue) as Partial<DevelopmentProfile>;
    return {
      displayName: parsedValue.displayName,
      participantCountry: normalizeParticipantCountry(parsedValue.participantCountry)
    };
  } catch {
    return undefined;
  }
}

function writeStoredDevelopmentProfile(profile: DevelopmentProfile): void {
  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
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

function getParticipantCountryFromLanguage(
  value: string | null
): MeetingParticipantCountry | undefined {
  if (value === "vi") {
    return "vn";
  }

  if (value === "ko") {
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
