import {
  OFFICE_DEFAULT_DESKS,
  OFFICE_MEETING_ZONE,
  OFFICE_WORLD_SIZE,
} from "@likelion2026/shared";

export const OFFICE_MAP = {
  assetPath: "/assets/maps/office-map.png",
  height: OFFICE_WORLD_SIZE.height,
  textureKey: "office-map",
  width: OFFICE_WORLD_SIZE.width,
} as const;

export const OFFICE_MAP_DEFAULT_DESKS = OFFICE_DEFAULT_DESKS;
export const OFFICE_MAP_MEETING_ZONE = OFFICE_MEETING_ZONE;
