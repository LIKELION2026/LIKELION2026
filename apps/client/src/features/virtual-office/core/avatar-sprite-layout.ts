import {
  OFFICE_AVATAR_IDS,
  type AvatarAnimation,
  type AvatarDirection,
  type OfficeAvatarId,
} from "@likelion2026/shared";

export interface AvatarFrameCrop {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

export interface AvatarSpriteLayout {
  footBaseline: number;
  frameCrop: AvatarFrameCrop;
  scale: number;
  sourceFrame: AvatarSourceFrame;
  variants: Partial<Record<AvatarSpriteVariantKey, AvatarSpriteLayoutOverride>>;
}

export type AvatarSpriteVariantKey = `${AvatarAnimation}-${AvatarDirection}`;

export interface AvatarSpriteLayoutOverride {
  footBaseline?: number;
  frameCrop?: AvatarFrameCrop;
  scale?: number;
  sourceFrame?: AvatarSourceFrame;
}

export interface ResolvedAvatarSpriteLayout {
  footBaseline: number;
  frameCrop: AvatarFrameCrop;
  scale: number;
  sourceFrame: AvatarSourceFrame;
}

export interface AvatarSourceFrame {
  height: number;
  offsetX: number;
  offsetY: number;
  width: number;
}

export const DEFAULT_AVATAR_SPRITE_LAYOUT: AvatarSpriteLayout = {
  footBaseline: 236,
  frameCrop: { bottom: 0, left: 0, right: 0, top: 0 },
  scale: 0.55,
  sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 },
  variants: {},
};

// 에셋별 투명 여백과 프레임 경계 누수를 보정한다.
// avatar-lab에서 값을 검증한 뒤 이 객체에 반영한다.
export const AVATAR_SPRITE_LAYOUTS: Record<OfficeAvatarId, AvatarSpriteLayout> = {
  capybara: createDefaultLayout({
    "idle-down": { footBaseline: 234, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 241, offsetX: 11, offsetY: 21, width: 244 } },
    "idle-left": { footBaseline: 236, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: -5, offsetY: 15, width: 254 } },
    "idle-up": { footBaseline: 232, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 240, offsetX: 12, offsetY: 25, width: 234 } },
  }),
  cat: createDefaultLayout({
    "walk-left": { footBaseline: 236, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 7, offsetY: -26, width: 236 } },
    "walk-right": { footBaseline: 250, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 10, offsetY: -26, width: 241 } },
    "walk-up": { footBaseline: 236, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 240, offsetX: 15, offsetY: -8, width: 233 } },
  }),
  cow: createDefaultLayout({
    "idle-left": { footBaseline: 242, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
    "idle-right": { footBaseline: 240, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
    "sit-down": { footBaseline: 205, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
    "sit-left": { footBaseline: 210, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 237, offsetX: 41, offsetY: -18, width: 244 } },
    "sit-right": { footBaseline: 205, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 230, offsetX: 32, offsetY: -12, width: 243 } },
    "sit-up": { footBaseline: 210, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
    "walk-left": { footBaseline: 240, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 13, offsetY: -26, width: 254 } },
    "walk-right": { footBaseline: 236, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 9, offsetY: -25, width: 254 } },
    "walk-up": { footBaseline: 237, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 13, offsetY: -11, width: 254 } },
  }),
  dog: createDefaultLayout({
    "sit-left": { footBaseline: 184, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 214, offsetX: 25, offsetY: -6, width: 225 } },
    "sit-right": { footBaseline: 286, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
    "sit-up": { footBaseline: 221, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
    "walk-down": { footBaseline: 236, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 240, offsetX: 1, offsetY: 8, width: 250 } },
    "walk-up": { footBaseline: 236, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 237, offsetX: 0, offsetY: 0, width: 251 } },
  }),
  eagle: createDefaultLayout({
    "idle-down": { footBaseline: 236, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 22, offsetY: 18, width: 254 } },
    "sit-down": { footBaseline: 213, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
    "sit-left": { footBaseline: 221, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
    "sit-right": { footBaseline: 215, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
    "sit-up": { footBaseline: 225, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
  }),
  hippo: createDefaultLayout({
    "idle-down": { footBaseline: 236, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 253, offsetX: 53, offsetY: 2, width: 231 } },
    "idle-left": { footBaseline: 253, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 39, offsetY: 5, width: 254 } },
    "idle-right": { footBaseline: 252, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 37, offsetY: 7, width: 254 } },
    "idle-up": { footBaseline: 250, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
    "sit-down": { footBaseline: 242, frameCrop: emptyFrameCrop(), scale: 0.46, sourceFrame: { height: 254, offsetX: 22, offsetY: 4, width: 254 } },
    "sit-left": { footBaseline: 226, frameCrop: emptyFrameCrop(), scale: 0.51, sourceFrame: { height: 234, offsetX: 9, offsetY: -9, width: 262 } },
    "sit-right": { footBaseline: 281, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
    "sit-up": { footBaseline: 227, frameCrop: emptyFrameCrop(), scale: 0.47, sourceFrame: { height: 249, offsetX: 24, offsetY: 2, width: 254 } },
    "walk-down": { footBaseline: 252, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
    "walk-left": { footBaseline: 255, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 257, offsetX: 16, offsetY: -22, width: 251 } },
    "walk-right": { footBaseline: 255, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 11, offsetY: -21, width: 254 } },
    "walk-up": { footBaseline: 275, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
  }),
  monkey: createDefaultLayout({
    "idle-down": { footBaseline: 255, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
    "idle-left": { footBaseline: 261, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
    "idle-right": { footBaseline: 258, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
    "idle-up": { footBaseline: 256, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
    "sit-down": { footBaseline: 236, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 239, offsetX: 35, offsetY: 6, width: 233 } },
    "sit-left": { footBaseline: 214, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 224, offsetX: 33, offsetY: -24, width: 220 } },
    "sit-right": { footBaseline: 223, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 232, offsetX: 30, offsetY: -28, width: 232 } },
    "sit-up": { footBaseline: 236, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 235, offsetX: 24, offsetY: -7, width: 243 } },
    "walk-down": { footBaseline: 236, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 248, offsetX: 12, offsetY: 1, width: 240 } },
    "walk-left": { footBaseline: 285, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
    "walk-right": { footBaseline: 286, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
    "walk-up": { footBaseline: 272, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
  }),
  parrot: createDefaultLayout({
    "idle-left": { footBaseline: 236, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: -13, offsetY: 4, width: 254 } },
    "sit-down": { footBaseline: 236, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 20, offsetY: 22, width: 254 } },
    "sit-left": { footBaseline: 218, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 236, offsetX: 33, offsetY: -10, width: 245 } },
    "sit-right": { footBaseline: 206, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 244, offsetX: 41, offsetY: -19, width: 243 } },
    "sit-up": { footBaseline: 220, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
    "walk-down": { footBaseline: 233, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 241, offsetX: 6, offsetY: -4, width: 253 } },
    "walk-left": { footBaseline: 239, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 261, offsetX: 11, offsetY: -32, width: 255 } },
    "walk-right": { footBaseline: 241, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 17, offsetY: -31, width: 254 } },
    "walk-up": { footBaseline: 235, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 2, offsetY: -27, width: 254 } },
  }),
  red_panda: createDefaultLayout({
    "idle-down": { footBaseline: 236, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: -1, offsetY: 17, width: 254 } },
    "idle-up": { footBaseline: 210, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 239, offsetX: 16, offsetY: 24, width: 237 } },
    "sit-down": { footBaseline: 200, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 44, offsetY: 19, width: 254 } },
    "sit-left": { footBaseline: 180, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 228, offsetX: 53, offsetY: -6, width: 225 } },
    "sit-right": { footBaseline: 180, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 225, offsetX: 46, offsetY: 0, width: 226 } },
    "sit-up": { footBaseline: 180, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 249, offsetX: 36, offsetY: 6, width: 249 } },
    "walk-down": { footBaseline: 250, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
    "walk-left": { footBaseline: 260, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
    "walk-right": { footBaseline: 260, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
    "walk-up": { footBaseline: 260, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
  }),
  sheep: createDefaultLayout({
    "idle-down": { footBaseline: 236, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 242, offsetX: 2, offsetY: 7, width: 245 } },
    "idle-left": { footBaseline: 236, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 246, offsetX: 9, offsetY: 5, width: 241 } },
    "idle-right": { footBaseline: 236, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 251, offsetX: 0, offsetY: 0, width: 248 } },
    "idle-up": { footBaseline: 236, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 251, offsetX: 0, offsetY: 0, width: 249 } },
    "sit-left": { footBaseline: 198, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 219, offsetX: 20, offsetY: -12, width: 237 } },
    "sit-right": { footBaseline: 289, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
    "sit-up": { footBaseline: 236, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 241, offsetX: 26, offsetY: -1, width: 252 } },
    "walk-down": { footBaseline: 236, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 238, offsetX: 10, offsetY: 3, width: 239 } },
    "walk-left": { footBaseline: 236, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 234, offsetX: 5, offsetY: -3, width: 230 } },
    "walk-right": { footBaseline: 236, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 237, offsetX: 0, offsetY: 0, width: 240 } },
    "walk-up": { footBaseline: 236, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 241, offsetX: 8, offsetY: 1, width: 241 } },
  }),
  wolf: createDefaultLayout({
    "idle-down": { footBaseline: 247, frameCrop: emptyFrameCrop(), scale: 0.52, sourceFrame: { height: 254, offsetX: 36, offsetY: 9, width: 240 } },
    "idle-left": { footBaseline: 246, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
    "idle-right": { footBaseline: 245, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
    "sit-left": { footBaseline: 264, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
    "sit-right": { footBaseline: 270, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
    "sit-up": { footBaseline: 232, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
  }),
  zebra: createDefaultLayout({
    "idle-down": { footBaseline: 221, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 248, offsetX: 26, offsetY: 15, width: 222 } },
    "walk-left": { footBaseline: 231, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 241, offsetX: 11, offsetY: 12, width: 244 } },
    "walk-right": { footBaseline: 241, frameCrop: emptyFrameCrop(), scale: 0.55, sourceFrame: { height: 254, offsetX: 0, offsetY: 0, width: 254 } },
  }),
};

export function getAvatarSpriteLayout(avatarId: string | undefined): AvatarSpriteLayout {
  return AVATAR_SPRITE_LAYOUTS[avatarId as OfficeAvatarId] ?? DEFAULT_AVATAR_SPRITE_LAYOUT;
}

export function getAvatarSpriteLayoutForVariant(
  avatarId: string | undefined,
  animation: AvatarAnimation,
  direction: AvatarDirection,
): ResolvedAvatarSpriteLayout {
  return resolveAvatarSpriteLayoutVariant(
    getAvatarSpriteLayout(avatarId),
    animation,
    direction,
  );
}

export function resolveAvatarSpriteLayoutVariant(
  layout: AvatarSpriteLayout,
  animation: AvatarAnimation,
  direction: AvatarDirection,
): ResolvedAvatarSpriteLayout {
  const override = layout.variants[createAvatarSpriteVariantKey(animation, direction)];
  return {
    footBaseline: override?.footBaseline ?? layout.footBaseline,
    frameCrop: { ...(override?.frameCrop ?? layout.frameCrop) },
    scale: override?.scale ?? layout.scale,
    sourceFrame: { ...(override?.sourceFrame ?? layout.sourceFrame) },
  };
}

export function createAvatarSpriteVariantKey(
  animation: AvatarAnimation,
  direction: AvatarDirection,
): AvatarSpriteVariantKey {
  return `${animation}-${direction}`;
}

export function applyAvatarFrameCrop(
  pixelData: Uint8ClampedArray,
  width: number,
  height: number,
  crop: AvatarFrameCrop,
): Uint8ClampedArray<ArrayBuffer> {
  const croppedData = Uint8ClampedArray.from(pixelData);
  const left = clampCrop(crop.left, width);
  const right = clampCrop(crop.right, width);
  const top = clampCrop(crop.top, height);
  const bottom = clampCrop(crop.bottom, height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x >= left && x < width - right && y >= top && y < height - bottom) {
        continue;
      }
      const offset = (y * width + x) * 4;
      croppedData[offset] = 0;
      croppedData[offset + 1] = 0;
      croppedData[offset + 2] = 0;
      croppedData[offset + 3] = 0;
    }
  }

  return croppedData;
}

export function serializeAvatarSpriteLayouts(
  layouts: Record<OfficeAvatarId, AvatarSpriteLayout>,
): string {
  const rows = OFFICE_AVATAR_IDS.map((id) => {
    const { footBaseline, frameCrop, scale, sourceFrame, variants } = layouts[id];
    const serializedVariants = Object.entries(variants)
      .map(([key, value]) => `"${key}": ${JSON.stringify(value)}`)
      .join(", ");
    return `  ${id}: { footBaseline: ${footBaseline}, frameCrop: { bottom: ${frameCrop.bottom}, left: ${frameCrop.left}, right: ${frameCrop.right}, top: ${frameCrop.top} }, scale: ${scale}, sourceFrame: { height: ${sourceFrame.height}, offsetX: ${sourceFrame.offsetX}, offsetY: ${sourceFrame.offsetY}, width: ${sourceFrame.width} }, variants: { ${serializedVariants} } },`;
  });

  return [
    "export const AVATAR_SPRITE_LAYOUTS: Record<OfficeAvatarId, AvatarSpriteLayout> = {",
    ...rows,
    "};",
  ].join("\n");
}

function clampCrop(value: number, size: number): number {
  return Math.min(Math.max(Math.round(value), 0), Math.floor(size / 3));
}

function createDefaultLayout(
  variants: AvatarSpriteLayout["variants"] = {},
): AvatarSpriteLayout {
  return {
    ...DEFAULT_AVATAR_SPRITE_LAYOUT,
    frameCrop: { ...DEFAULT_AVATAR_SPRITE_LAYOUT.frameCrop },
    sourceFrame: { ...DEFAULT_AVATAR_SPRITE_LAYOUT.sourceFrame },
    variants,
  };
}

function emptyFrameCrop(): AvatarFrameCrop {
  return { bottom: 0, left: 0, right: 0, top: 0 };
}
