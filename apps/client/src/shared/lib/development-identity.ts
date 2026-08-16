import type { CountryCode, LanguageCode } from "@likelion2026/shared";

export interface DevelopmentIdentity {
  countryCode: CountryCode;
  displayName: string;
  language: LanguageCode;
}

export function getDevelopmentIdentity(): DevelopmentIdentity {
  const query = new URLSearchParams(window.location.search);
  const displayName = query.get("name")?.trim() || "Guest Member";
  const language = query.get("lang") === "vi" ? "vi" : "ko";
  const countryCode = query.get("country") === "VN" ? "VN" : "KR";

  return {
    countryCode,
    displayName,
    language
  };
}
