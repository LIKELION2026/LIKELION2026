import type {
  CreateGuestOfficeSessionRequest,
  GuestOfficeSessionResponse
} from "@likelion2026/shared";

import { SERVER_URL } from "../../../shared/config/environment";

const GUEST_TOKEN_STORAGE_KEY = "virtual-office.guest-token";

export async function createOrRestoreOfficeSession(
  request: Omit<CreateGuestOfficeSessionRequest, "guestToken">
): Promise<GuestOfficeSessionResponse> {
  const guestToken = window.localStorage.getItem(GUEST_TOKEN_STORAGE_KEY) ?? undefined;
  const response = await fetch(`${SERVER_URL}/office/session`, {
    body: JSON.stringify({ ...request, ...(guestToken ? { guestToken } : {}) }),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error("오피스 세션을 준비하지 못했습니다.");
  }

  const session = (await response.json()) as GuestOfficeSessionResponse;
  window.localStorage.setItem(GUEST_TOKEN_STORAGE_KEY, session.guestToken);
  return session;
}
