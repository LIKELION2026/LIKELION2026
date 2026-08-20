export interface MeetingChatDraftKeyInput {
  isComposing?: boolean;
  key: string;
  keyCode?: number;
  shiftKey: boolean;
}

export function shouldSubmitMeetingChatDraftKey({
  isComposing = false,
  key,
  keyCode,
  shiftKey
}: MeetingChatDraftKeyInput): boolean {
  if (key !== "Enter" || shiftKey) {
    return false;
  }

  return !isComposing && keyCode !== 229;
}
