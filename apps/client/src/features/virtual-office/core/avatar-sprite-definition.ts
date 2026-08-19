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
  faceCenterOffset: { x: number; y: number };
  footBaseline: number;
  frameSources: AvatarFrameSource[];
  id: string;
  idleFrameByDirection: Record<AvatarDirection, number>;
  label: string;
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

const AVATAR_LABELS: Record<OfficeAvatarId, string> = {
  capybara: "카피바라",
  cat: "고양이",
  cow: "소",
  dog: "강아지",
  eagle: "독수리",
  hippo: "하마",
  monkey: "원숭이",
  parrot: "앵무새",
  red_panda: "레드판다",
  sheep: "양",
  wolf: "늑대",
  zebra: "얼룩말",
};

// The exported sheets keep a common 256px frame but each character is drawn at
// a different center. These offsets center the idle-down frame only in UI icons.
const AVATAR_FACE_CENTER_OFFSETS: Record<
  OfficeAvatarId,
  { x: number; y: number }
> = {
  capybara: { x: 0, y: -13.5 },
  cat: { x: -15.5, y: -10.5 },
  cow: { x: -27, y: -13 },
  dog: { x: -5.5, y: -15 },
  eagle: { x: -15.5, y: -19 },
  hippo: { x: -42, y: -3 },
  monkey: { x: -6, y: -13.5 },
  parrot: { x: -10, y: -2 },
  red_panda: { x: -15.5, y: -19.5 },
  sheep: { x: 1, y: -11 },
  wolf: { x: -29.5, y: -5 },
  zebra: { x: 0.5, y: -13.5 },
};

// Capybara's front and sitting frames leave less lower margin than the other
// sheets. Keep its baseline higher so the feet do not meet the frame edge.
const AVATAR_FOOT_BASELINES: Partial<Record<OfficeAvatarId, number>> = {
  capybara: 210,
};

function createAvatarSpriteDefinition(
  id: OfficeAvatarId,
): AvatarSpriteDefinition {
  return {
    assetPath: `/assets/${id}.png`,
    faceCenterOffset: AVATAR_FACE_CENTER_OFFSETS[id],
    footBaseline: AVATAR_FOOT_BASELINES[id] ?? 236,
    frameSources: createFrameSources(),
    id,
    idleFrameByDirection: { down: 0, left: 2, right: 2, up: 1 },
    label: AVATAR_LABELS[id],
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
  _animation: AvatarAnimation,
): boolean {
  if (direction !== "left" && direction !== "right") {
    return false;
  }

  // All supplied side-facing frames look right. Keep one flip rule for idle,
  // walking, and sitting so a character cannot reverse when it stops moving.
  return direction === "left";
}
