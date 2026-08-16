export type BriefingItemType =
  | "decision"
  | "open_question"
  | "action_item"
  | "missing_context";

export interface BriefingEvidenceRef {
  sourceId: string;
  sourceType: "subtitle" | "status_event" | "user_note";
}

export interface BriefingItem {
  itemId: string;
  type: BriefingItemType;
  content: string;
  assigneeMemberId?: string;
  dueAt?: string;
  evidenceRefs: BriefingEvidenceRef[];
  needsConfirmation: boolean;
}

export interface BriefingDraftedPayload {
  briefingId: string;
  teamId: string;
  roomName: string;
  items: BriefingItem[];
  occurredAt: string;
}

export interface BriefingConfirmedPayload {
  briefingId: string;
  teamId: string;
  confirmedByMemberId: string;
  items: BriefingItem[];
  occurredAt: string;
}
