import type { CSSProperties, JSX } from "react";

import { getAvatarSpriteDefinition } from "../core/avatar-sprite-definition";

interface AvatarFaceProps {
  avatarId: string | undefined;
  size?: number;
}

export function AvatarFace({ avatarId, size = 64 }: AvatarFaceProps): JSX.Element {
  const definition = getAvatarSpriteDefinition(avatarId);
  const frame = definition.frameSources[definition.idleFrameByDirection.down]!;
  const scale = size / frame.width;

  const wrapperStyle: CSSProperties = {
    height: size,
    width: size
  };
  const spriteStyle: CSSProperties = {
    backgroundImage: `url(${definition.assetPath})`,
    backgroundPosition: `-${frame.x}px -${frame.y}px`,
    height: frame.height,
    transform: `translate(${definition.faceCenterOffset.x * scale}px, ${definition.faceCenterOffset.y * scale}px) scale(${scale})`,
    width: frame.width
  };

  return (
    <div aria-hidden="true" className="hud-face" style={wrapperStyle}>
      <div className="hud-face-sprite" style={spriteStyle} />
    </div>
  );
}
