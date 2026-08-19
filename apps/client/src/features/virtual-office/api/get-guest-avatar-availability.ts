import type { GuestOfficeAvatarAvailabilityResponse } from "@likelion2026/shared";

import { SERVER_URL } from "../../../shared/config/environment";

export async function getGuestAvatarAvailability(): Promise<GuestOfficeAvatarAvailabilityResponse> {
  const response = await fetch(`${SERVER_URL}/office/avatars`);
  if (!response.ok) {
    throw new Error("사용 가능한 아바타를 불러오지 못했습니다.");
  }

  return response.json() as Promise<GuestOfficeAvatarAvailabilityResponse>;
}
