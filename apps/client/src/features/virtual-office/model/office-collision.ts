import { OFFICE_WORLD_SIZE } from "@likelion2026/shared";

export interface OfficeCollisionArea {
  height: number;
  id: string;
  width: number;
  x: number;
  y: number;
}

export interface OfficePosition {
  x: number;
  y: number;
}

export const OFFICE_WALKABLE_BOUNDS = {
  height: 2630,
  width: 3680,
  x: 210,
  y: 80,
} as const;

// These rectangles describe fixed structural walls and the large furniture
// silhouettes in the exported Figma map. Doorways and aisles stay unblocked.
export const OFFICE_COLLISION_AREAS: readonly OfficeCollisionArea[] = [
  { height: 2327, id: "west-exterior-wall", width: 285, x: 6, y: 125 },
  { height: 2804, id: "east-exterior-wall", width: 224, x: 3872, y: 0 },
  { height: 106, id: "north-exterior-wall", width: 4095, x: 1, y: 0 },
  { height: 205, id: "south-meeting-wall", width: 765, x: 1687, y: 1753 },
  { height: 271, id: "north-west-room-wall", width: 463, x: 913, y: 621 },
  { height: 247, id: "north-middle-room-wall", width: 556, x: 1545, y: 621 },
  { height: 247, id: "north-east-room-wall", width: 334, x: 2277, y: 609 },
  { height: 647, id: "west-desk-bank", width: 261, x: 432, y: 993 },
  { height: 667, id: "east-desk-bank", width: 267, x: 1030, y: 993 },
  { height: 105, id: "lounge-sofa", width: 667, x: 1745, y: 2075 },
  { height: 128, id: "lounge-table", width: 246, x: 1346, y: 400 },
  { height: 208, id: "idea-board", width: 288, x: 2492, y: 1023 },
  { height: 189, id: "conference-table", width: 538, x: 3202, y: 1115 },
  { height: 374, id: "meeting-table", width: 4096, x: 0, y: 2430 },
  { height: 810, id: "custom-collision-1", width: 808, x: 259, y: 57 },
  { height: 272, id: "custom-collision-2", width: 223, x: 1735, y: 5 },
  { height: 107, id: "custom-collision-3", width: 160, x: 1812, y: 1196 },
  { height: 347, id: "custom-collision-4", width: 747, x: 985, y: 5 },
  { height: 355, id: "custom-collision-5", width: 107, x: 1869, y: 267 },
  { height: 265, id: "custom-collision-6", width: 1964, x: 1936, y: 94 },
  { height: 862, id: "custom-collision-7", width: 1246, x: 139, y: 1741 },
  { height: 313, id: "custom-collision-8", width: 159, x: 1348, y: 1745 },
  { height: 229, id: "custom-collision-9", width: 1375, x: 2652, y: 1738 },
  { height: 772, id: "custom-collision-10", width: 1366, x: 2730, y: 1944 },
  { height: 614, id: "custom-collision-11", width: 70, x: 2999, y: 627 },
  { height: 255, id: "custom-collision-12", width: 1252, x: 2783, y: 619 },
  { height: 401, id: "custom-collision-13", width: 42, x: 3012, y: 1360 },
  { height: 122, id: "custom-collision-14", width: 304, x: 2030, y: 404 },
  { height: 135, id: "custom-collision-15", width: 193, x: 2625, y: 386 },
  { height: 385, id: "custom-collision-16", width: 78, x: 2420, y: 307 },
  { height: 459, id: "custom-collision-17", width: 1059, x: 2990, y: 331 },
  { height: 74, id: "custom-collision-18", width: 90, x: 2599, y: 1426 },
] as const;

export function isOfficeCollisionDebugEnabled(search: string): boolean {
  return new URLSearchParams(search).get("debugCollisions") === "1";
}

export function isOfficeWalkablePosition(position: OfficePosition): boolean {
  if (
    position.x < OFFICE_WALKABLE_BOUNDS.x ||
    position.x > OFFICE_WALKABLE_BOUNDS.x + OFFICE_WALKABLE_BOUNDS.width ||
    position.y < OFFICE_WALKABLE_BOUNDS.y ||
    position.y > OFFICE_WALKABLE_BOUNDS.y + OFFICE_WALKABLE_BOUNDS.height
  ) {
    return false;
  }

  return !OFFICE_COLLISION_AREAS.some((area) =>
    isPointInsideArea(position, area),
  );
}

export function getNearestWalkableOfficePosition(
  position: OfficePosition,
): OfficePosition {
  const boundedPosition = {
    x: clamp(
      position.x,
      OFFICE_WALKABLE_BOUNDS.x,
      OFFICE_WALKABLE_BOUNDS.x + OFFICE_WALKABLE_BOUNDS.width,
    ),
    y: clamp(
      position.y,
      OFFICE_WALKABLE_BOUNDS.y,
      OFFICE_WALKABLE_BOUNDS.y + OFFICE_WALKABLE_BOUNDS.height,
    ),
  };

  if (isOfficeWalkablePosition(boundedPosition)) {
    return boundedPosition;
  }

  const searchOffsets = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
    [1, -1],
    [1, 1],
    [-1, 1],
    [-1, -1],
  ] as const;

  for (let distance = 32; distance <= 480; distance += 32) {
    for (const [offsetX, offsetY] of searchOffsets) {
      const candidate = {
        x: clamp(
          boundedPosition.x + offsetX * distance,
          OFFICE_WALKABLE_BOUNDS.x,
          OFFICE_WALKABLE_BOUNDS.x + OFFICE_WALKABLE_BOUNDS.width,
        ),
        y: clamp(
          boundedPosition.y + offsetY * distance,
          OFFICE_WALKABLE_BOUNDS.y,
          OFFICE_WALKABLE_BOUNDS.y + OFFICE_WALKABLE_BOUNDS.height,
        ),
      };

      if (isOfficeWalkablePosition(candidate)) {
        return candidate;
      }
    }
  }

  return {
    x: OFFICE_WORLD_SIZE.width / 2,
    y: OFFICE_WORLD_SIZE.height / 2,
  };
}

function isPointInsideArea(
  position: OfficePosition,
  area: OfficeCollisionArea,
): boolean {
  return (
    position.x >= area.x &&
    position.x <= area.x + area.width &&
    position.y >= area.y &&
    position.y <= area.y + area.height
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
