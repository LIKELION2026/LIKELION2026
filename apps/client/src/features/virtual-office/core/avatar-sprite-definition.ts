import type { AvatarAnimation, AvatarDirection } from "@likelion2026/shared";

export const DEFAULT_AVATAR_ID = "office-avatar";
export const GRAY_CAT_AVATAR_ID = "gray-cat";

interface AvatarFrameSource {
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
  scale: number;
  textureKey: string;
  walkFramesByDirection: Record<AvatarDirection, number[]>;
}

const DEFAULT_FRAME_SIZE = 256;
const DEFAULT_BORDER_TRIM = 2;
const DEFAULT_FRAME_CONTENT_SIZE = DEFAULT_FRAME_SIZE - DEFAULT_BORDER_TRIM * 2;

const DEFAULT_AVATAR_DEFINITION: AvatarSpriteDefinition = {
  assetPath: "/assets/image.png",
  footBaseline: 236,
  frameSources: Array.from({ length: 24 }, (_, frame) => ({
    height: DEFAULT_FRAME_CONTENT_SIZE,
    width: DEFAULT_FRAME_CONTENT_SIZE,
    x: (frame % 6) * DEFAULT_FRAME_SIZE + DEFAULT_BORDER_TRIM,
    y: Math.floor(frame / 6) * DEFAULT_FRAME_SIZE + DEFAULT_BORDER_TRIM
  })),
  id: DEFAULT_AVATAR_ID,
  idleFrameByDirection: { down: 0, left: 2, right: 2, up: 1 },
  scale: 0.16,
  textureKey: "office-avatar",
  walkFramesByDirection: {
    down: [6, 7, 8, 9, 10, 11],
    left: [18, 19, 20, 21, 22, 23],
    right: [18, 19, 20, 21, 22, 23],
    up: [12, 13, 14, 15, 16, 17]
  }
};

const GRAY_CAT_AVATAR_DEFINITION: AvatarSpriteDefinition = {
  assetPath: "/assets/gray-cat.webp",
  footBaseline: 122,
  frameSources: [
    { height: 128, width: 128, x: 56, y: 32 },
    { height: 128, width: 128, x: 184, y: 32 },
    { height: 128, width: 128, x: 312, y: 32 },
    { height: 128, width: 128, x: 440, y: 32 }
  ],
  id: GRAY_CAT_AVATAR_ID,
  idleFrameByDirection: { down: 0, left: 2, right: 3, up: 1 },
  scale: 0.32,
  textureKey: "gray-cat-avatar",
  walkFramesByDirection: {
    down: [0],
    left: [2],
    right: [3],
    up: [1]
  }
};

export function getAvatarSpriteDefinition(avatarId: string | undefined): AvatarSpriteDefinition {
  return avatarId === GRAY_CAT_AVATAR_ID
    ? GRAY_CAT_AVATAR_DEFINITION
    : DEFAULT_AVATAR_DEFINITION;
}

export function getAvatarSpriteDefinitions(): AvatarSpriteDefinition[] {
  return [DEFAULT_AVATAR_DEFINITION, GRAY_CAT_AVATAR_DEFINITION];
}

export function getAvatarFrameIndex(
  definition: AvatarSpriteDefinition,
  direction: AvatarDirection,
  animation: AvatarAnimation
): number {
  return animation === "walk"
    ? definition.walkFramesByDirection[direction][0]!
    : definition.idleFrameByDirection[direction];
}

export function shouldFlipAvatarSprite(
  avatarId: string | undefined,
  direction: AvatarDirection,
  animation: AvatarAnimation
): boolean {
  if (avatarId === GRAY_CAT_AVATAR_ID || (direction !== "left" && direction !== "right")) {
    return false;
  }

  return direction === "left" ? animation === "walk" : animation === "idle";
}
