import {
  OFFICE_AVATAR_IDS,
  type AvatarAnimation,
  type AvatarDirection,
  type OfficeAvatarId,
} from "@likelion2026/shared";

export const DEFAULT_AVATAR_ID: OfficeAvatarId = "red_panda";

export interface AvatarFrameSource {
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface AvatarSpriteDefinition {
  assetPath: string;
  footBaseline: number;
  frameSources: AvatarFrameSource[];
  id: string;
  idleFrameByDirection: Record<AvatarDirection, number>;
  labelKey: `avatar.labels.${OfficeAvatarId}`;
  scale: number;
  sitAssetPath: string;
  sitFramesByDirection: Record<AvatarDirection, number[]>;
  sitTextureKey: string;
  textureKey: string;
  walkFramesByDirection: Record<AvatarDirection, number[]>;
}

const FRAME_SIZE = 256;
const BORDER_TRIM = 2;
const FRAME_CONTENT_SIZE = FRAME_SIZE - BORDER_TRIM * 2;
const FURNISHED_OFFICE_AVATAR_SCALE = 0.55;

const createFrameSources = (): AvatarFrameSource[] =>
  Array.from({ length: 24 }, (_, frame) => ({
    height: FRAME_CONTENT_SIZE,
    width: FRAME_CONTENT_SIZE,
    x: (frame % 6) * FRAME_SIZE + BORDER_TRIM,
    y: Math.floor(frame / 6) * FRAME_SIZE + BORDER_TRIM,
  }));

function createAvatarSpriteDefinition(
  id: OfficeAvatarId,
): AvatarSpriteDefinition {
  return {
    assetPath: `/assets/${id}.png`,
    footBaseline: 236,
    frameSources: createFrameSources(),
    id,
    idleFrameByDirection: { down: 0, left: 2, right: 2, up: 1 },
    labelKey: `avatar.labels.${id}`,
    scale: FURNISHED_OFFICE_AVATAR_SCALE,
    sitAssetPath: `/assets/${id}_sit.png`,
    sitFramesByDirection: {
      down: [0, 1, 2, 3, 4, 5],
      left: [12, 13, 14, 15, 16, 17],
      right: [12, 13, 14, 15, 16, 17],
      up: [6, 7, 8, 9, 10, 11],
    },
    sitTextureKey: `office-avatar-${id}-sit`,
    textureKey: `office-avatar-${id}`,
    walkFramesByDirection: {
      down: [6, 7, 8, 9, 10, 11],
      left: [18, 19, 20, 21, 22, 23],
      right: [18, 19, 20, 21, 22, 23],
      up: [12, 13, 14, 15, 16, 17],
    },
  };
}

const AVATAR_SPRITE_DEFINITIONS = OFFICE_AVATAR_IDS.map(
  createAvatarSpriteDefinition,
);
const AVATAR_SPRITE_DEFINITION_BY_ID = new Map(
  AVATAR_SPRITE_DEFINITIONS.map((definition) => [definition.id, definition]),
);

export function getAvatarSpriteDefinition(
  avatarId: string | undefined,
): AvatarSpriteDefinition {
  return (
    AVATAR_SPRITE_DEFINITION_BY_ID.get(avatarId ?? DEFAULT_AVATAR_ID) ??
    AVATAR_SPRITE_DEFINITION_BY_ID.get(DEFAULT_AVATAR_ID)!
  );
}

export function getAvatarSpriteDefinitions(): AvatarSpriteDefinition[] {
  return AVATAR_SPRITE_DEFINITIONS;
}

export function getAvatarFrameIndex(
  definition: AvatarSpriteDefinition,
  direction: AvatarDirection,
  animation: AvatarAnimation,
): number {
  if (animation === "walk") {
    return definition.walkFramesByDirection[direction][0]!;
  }

  if (animation === "sit") {
    return definition.sitFramesByDirection[direction][0]!;
  }

  return definition.idleFrameByDirection[direction];
}

export function getRequiredAvatarFrameIndices(
  definition: AvatarSpriteDefinition,
  animation: "sit" | "walk" = "walk",
): number[] {
  if (animation === "sit") {
    return [...new Set(Object.values(definition.sitFramesByDirection).flat())];
  }

  return [
    ...new Set([
      ...Object.values(definition.idleFrameByDirection),
      ...Object.values(definition.walkFramesByDirection).flat(),
    ]),
  ].sort((left, right) => left - right);
}

export function shouldFlipAvatarSprite(
  _avatarId: string | undefined,
  direction: AvatarDirection,
  animation: AvatarAnimation,
): boolean {
  if (direction !== "left" && direction !== "right") {
    return false;
  }

  if (animation === "sit") {
    return direction === "left";
  }

  return direction === "left" ? animation === "walk" : animation === "idle";
}
