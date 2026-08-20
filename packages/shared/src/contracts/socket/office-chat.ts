export interface OfficeChatSendPayload {
  text: string;
}

export interface OfficeChatMessagePayload {
  displayName: string;
  memberId: string;
  occurredAt: string;
  teamId: string;
  text: string;
}
