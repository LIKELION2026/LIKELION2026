import type { GuestOfficeAvatarAvailabilityResponse } from "@likelion2026/shared";

import { SERVER_URL } from "../../../shared/config/environment";

export class GuestAvatarAvailabilityRequestError extends Error {
  constructor() {
    super("avatarAvailability");
    this.name = "GuestAvatarAvailabilityRequestError";
  }
}

export async function getGuestAvatarAvailability(): Promise<GuestOfficeAvatarAvailabilityResponse> {
  const response = await fetch(`${SERVER_URL}/office/avatars`);
  if (!response.ok) {
    throw new GuestAvatarAvailabilityRequestError();
  }

  return response.json() as Promise<GuestOfficeAvatarAvailabilityResponse>;
}
