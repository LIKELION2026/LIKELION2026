import { OFFICE_AVATAR_IDS, type OfficeAvatarId } from "@likelion2026/shared";

export const DEFAULT_OFFICE_AVATAR_ID = OFFICE_AVATAR_IDS[0];

export function getAvailableGuestAvatarIds(
  assignedAvatarIds: readonly string[]
): OfficeAvatarId[] {
  const assignedAvatarIdSet = new Set(assignedAvatarIds);
  return OFFICE_AVATAR_IDS.filter((avatarId) => !assignedAvatarIdSet.has(avatarId));
}

export function selectNewGuestAvatarId(
  assignedAvatarIds: readonly string[],
  random: () => number = Math.random
): OfficeAvatarId | null {
  const availableAvatarIds = getAvailableGuestAvatarIds(assignedAvatarIds);
  if (availableAvatarIds.length === 0) {
    return null;
  }

  return availableAvatarIds[Math.floor(random() * availableAvatarIds.length)] ?? null;
}
