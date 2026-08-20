import {
  OFFICE_AVATAR_IDS,
  type OfficeAvatarId,
} from "@likelion2026/shared";

export interface AvatarOverlayOffsets {
  chatY: number;
  nameY: number;
  statusY: number;
}

export const DEFAULT_AVATAR_OVERLAY_OFFSETS: AvatarOverlayOffsets = {
  chatY: -126,
  nameY: -80,
  statusY: -130,
};

// 아바타 프레임의 투명 여백과 실제 캐릭터 높이가 서로 달라,
// 오피스 위젯의 기준점을 아바타별로 조정할 수 있도록 분리한다.
export const AVATAR_OVERLAY_OFFSETS: Record<OfficeAvatarId, AvatarOverlayOffsets> = {
  capybara: { chatY: -130, nameY: -90, statusY: -143 },
  cat: { chatY: -140, nameY: -103, statusY: -157 },
  cow: { chatY: -155, nameY: -110, statusY: -165 },
  dog: { chatY: -148, nameY: -110, statusY: -161 },
  eagle: { chatY: -151, nameY: -106, statusY: -161 },
  hippo: { chatY: -146, nameY: -109, statusY: -161 },
  monkey: { chatY: -137, nameY: -99, statusY: -150 },
  parrot: { chatY: -159, nameY: -114, statusY: -164 },
  red_panda: { chatY: -151, nameY: -112, statusY: -165 },
  sheep: { chatY: -153, nameY: -111, statusY: -169 },
  wolf: { chatY: -153, nameY: -113, statusY: -163 },
  zebra: { chatY: -135, nameY: -95, statusY: -146 },
};

export function getAvatarOverlayOffsets(
  avatarId: string | undefined,
): AvatarOverlayOffsets {
  return AVATAR_OVERLAY_OFFSETS[avatarId as OfficeAvatarId] ?? DEFAULT_AVATAR_OVERLAY_OFFSETS;
}

export function serializeAvatarOverlayOffsets(
  offsets: Record<OfficeAvatarId, AvatarOverlayOffsets>,
): string {
  const rows = OFFICE_AVATAR_IDS.map((id) => {
    const value = offsets[id];
    return `  ${id}: { chatY: ${value.chatY}, nameY: ${value.nameY}, statusY: ${value.statusY} },`;
  });

  return [
    "export const AVATAR_OVERLAY_OFFSETS: Record<OfficeAvatarId, AvatarOverlayOffsets> = {",
    ...rows,
    "};",
  ].join("\n");
}
