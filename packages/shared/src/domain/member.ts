import type { LanguageCode } from "./language";

export const MEMBER_STATUS_VALUES = [
  "available",
  "focused",
  "in_meeting",
  "away"
] as const;

export type MemberStatus = (typeof MEMBER_STATUS_VALUES)[number];

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  available: "협업 가능",
  away: "자리 비움",
  focused: "집중 작업",
  in_meeting: "회의 중"
};

export type WorkContextSource = "manual" | "ai_suggestion";

export interface MemberWorkContext {
  summary: string;
  availableAt?: string;
  source: WorkContextSource;
}

export interface MemberPresence {
  memberId: string;
  displayName: string;
  language: LanguageCode;
  status: MemberStatus;
  updatedAt: string;
  workContext?: MemberWorkContext;
}
