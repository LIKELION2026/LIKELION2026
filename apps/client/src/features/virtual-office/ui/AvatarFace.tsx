import type { CSSProperties, JSX } from "react";

import { DEFAULT_AVATAR_ID, getAvatarSpriteDefinition } from "../core/avatar-sprite-definition";

interface AvatarFaceProps {
  avatarId: string | undefined;
  size?: number;
}

// idle-down 프레임 안에서 캐릭터 그림이 프레임 중앙보다 오른쪽 아래로
// 치우쳐 있어(원본 스프라이트 시트 문제), 원형 아이콘에 넣을 때만
// 중앙으로 보정한다. 실측: opaque 영역 중심이 프레임 중심에서 (15.5, 19.5)만큼 벗어남.
const FACE_CENTER_OFFSET: Record<string, { x: number; y: number }> = {
  [DEFAULT_AVATAR_ID]: { x: -15.5, y: -19.5 }
};

export function AvatarFace({ avatarId, size = 64 }: AvatarFaceProps): JSX.Element {
  const definition = getAvatarSpriteDefinition(avatarId);
  const frame = definition.frameSources[definition.idleFrameByDirection.down]!;
  const scale = size / frame.width;
  const centerOffset = FACE_CENTER_OFFSET[definition.id] ?? { x: 0, y: 0 };

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
