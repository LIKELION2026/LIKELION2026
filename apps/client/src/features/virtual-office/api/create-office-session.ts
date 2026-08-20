import type {
  CreateGuestOfficeSessionRequest,
  GuestOfficeSessionResponse
} from "@likelion2026/shared";

import { SERVER_URL } from "../../../shared/config/environment";

const GUEST_TOKEN_STORAGE_KEY = "virtual-office.guest-token";

export type OfficeSessionErrorReason =
  | "avatarInUse"
  | "network"
  | "noAvailableAvatar"
  | "prepareFailed";

export class OfficeSessionRequestError extends Error {
  constructor(readonly reason: OfficeSessionErrorReason) {
    super(reason);
    this.name = "OfficeSessionRequestError";
  }
}

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
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    if (body?.message === "This avatar is already in use") {
      throw new OfficeSessionRequestError("avatarInUse");
    }
    if (body?.message === "No available avatar remains in this office") {
      throw new OfficeSessionRequestError("noAvailableAvatar");
    }
    throw new OfficeSessionRequestError("prepareFailed");
  }

  const session = (await response.json()) as GuestOfficeSessionResponse;
  window.localStorage.setItem(GUEST_TOKEN_STORAGE_KEY, session.guestToken);
  return session;
}

export function getOfficeSessionErrorReason(
  error: unknown
): OfficeSessionErrorReason {
  if (error instanceof OfficeSessionRequestError) {
    return error.reason;
  }

  if (
    error instanceof Error &&
    (error.message.includes("Failed to fetch") ||
      error.message.includes("NetworkError"))
  ) {
    return "network";
  }

  return "prepareFailed";
}
