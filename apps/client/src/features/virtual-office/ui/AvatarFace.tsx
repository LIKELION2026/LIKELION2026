import type { CSSProperties, JSX } from "react";

import { getAvatarSpriteDefinition } from "../core/avatar-sprite-definition";

interface AvatarFaceProps {
  avatarId: string | undefined;
  size?: number;
}

// 각 스프라이트의 idle-down 프레임에서 실제 캐릭터 픽셀의 중심을 기준으로 보정한다.
// 원본 에셋의 투명 여백이 캐릭터마다 달라, 공통 프레임 안에서 그대로 렌더링하면
// 하마, 늑대, 소처럼 오른쪽으로 치우쳐 보인다.
const FACE_CENTER_OFFSETS: Record<string, { x: number; y: number }> = {
  capybara: { x: 0, y: -13.5 },
  cat: { x: -15, y: -10.5 },
  cow: { x: -27, y: -13 },
  dog: { x: -5.5, y: -15 },
  eagle: { x: -15.5, y: -19 },
  hippo: { x: -42, y: -3 },
  monkey: { x: -6, y: -13.5 },
  parrot: { x: -10, y: -2.5 },
  red_panda: { x: -15.5, y: -19.5 },
  sheep: { x: 1, y: -11 },
  wolf: { x: -29.5, y: -5 },
  zebra: { x: 0.5, y: -13.5 }
};

export function AvatarFace({ avatarId, size = 64 }: AvatarFaceProps): JSX.Element {
  const definition = getAvatarSpriteDefinition(avatarId);
  const frame = definition.frameSources[definition.idleFrameByDirection.down]!;
  const scale = size / frame.width;
  const centerOffset = FACE_CENTER_OFFSETS[definition.id] ?? { x: 0, y: 0 };

  const wrapperStyle: CSSProperties = {
    height: size,
    width: size
  };
  const spriteStyle: CSSProperties = {
    backgroundImage: `url(${definition.assetPath})`,
    backgroundPosition: `-${frame.x}px -${frame.y}px`,
    height: frame.height,
    transform: `translate(${centerOffset.x * scale}px, ${centerOffset.y * scale}px) scale(${scale})`,
    width: frame.width
  };

  return (
    <div aria-hidden="true" className="hud-face" style={wrapperStyle}>
      <div className="hud-face-sprite" style={spriteStyle} />
    </div>
  );
}
