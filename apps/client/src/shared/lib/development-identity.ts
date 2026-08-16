import type { LanguageCode } from "@likelion2026/shared";

const MEMBER_ID_STORAGE_KEY = "virtual-office.member-id";

export interface DevelopmentIdentity {
  displayName: string;
  language: LanguageCode;
  memberId: string;
  teamId: string;
}

export function getDevelopmentIdentity(): DevelopmentIdentity {
  const query = new URLSearchParams(window.location.search);
  const displayName = query.get("name")?.trim() || "Guest Member";
  const language = query.get("lang") === "en" ? "en" : "ko";
  const memberId = getMemberId();

  return {
    displayName,
    language,
    memberId,
    teamId: "demo-global-team"
  };
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
