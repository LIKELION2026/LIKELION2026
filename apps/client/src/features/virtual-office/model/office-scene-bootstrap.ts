import type { OfficeMemberPresence } from "@likelion2026/shared";

export interface OfficeSceneBootstrap {
  direction: OfficeMemberPresence["avatar"]["direction"];
  x: number;
  y: number;
}

export function getOfficeSceneBootstrap(
  self: OfficeMemberPresence | null
): OfficeSceneBootstrap | null {
  if (!self) {
    return null;
  }

  return {
    direction: self.avatar.direction,
    x: self.avatar.x,
    y: self.avatar.y
  };
}
