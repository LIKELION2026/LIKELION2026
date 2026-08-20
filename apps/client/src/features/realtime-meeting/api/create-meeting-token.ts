import type {
  CreateMeetingTokenRequest,
  CreateMeetingTokenResponse
} from "@likelion2026/shared";

import { SERVER_URL } from "../../../shared/config/environment";

export async function createMeetingToken(
  request: CreateMeetingTokenRequest,
  options: { signal?: AbortSignal } = {}
): Promise<CreateMeetingTokenResponse> {
  const response = await fetch(`${SERVER_URL}/meeting/token`, {
    body: JSON.stringify(request),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST",
    signal: options.signal
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
    throw new Error(message ?? "meetingErrors.tokenCreateFailed");
  }

  return (await response.json()) as CreateMeetingTokenResponse;
}
