import type { ListMockSubtitlesResponse } from "@likelion2026/shared";

import { SERVER_URL } from "../../../shared/config/environment";

export async function listMockSubtitles(
  roomName: string
): Promise<ListMockSubtitlesResponse> {
  const response = await fetch(
    `${SERVER_URL}/meeting/rooms/${encodeURIComponent(roomName)}/subtitles`
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : body?.message;

    throw new Error(message ?? "meetingErrors.subtitlesLoadFailed");
  }

  return (await response.json()) as ListMockSubtitlesResponse;
}
