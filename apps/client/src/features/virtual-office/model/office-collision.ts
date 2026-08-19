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
  { height: 1560, id: "west-exterior-wall", width: 70, x: 210, y: 650 },
  { height: 1560, id: "east-exterior-wall", width: 70, x: 3820, y: 650 },
  { height: 70, id: "north-exterior-wall", width: 2920, x: 970, y: 80 },
  { height: 70, id: "south-meeting-wall", width: 1450, x: 1220, y: 2640 },
  { height: 70, id: "north-west-room-wall", width: 310, x: 990, y: 620 },
  { height: 70, id: "north-middle-room-wall", width: 290, x: 1570, y: 620 },
  { height: 70, id: "north-east-room-wall", width: 310, x: 2240, y: 620 },
  { height: 850, id: "west-desk-bank", width: 255, x: 500, y: 980 },
  { height: 850, id: "east-desk-bank", width: 255, x: 1030, y: 980 },
  { height: 330, id: "lounge-sofa", width: 550, x: 1840, y: 1650 },
  { height: 250, id: "lounge-table", width: 220, x: 2020, y: 1510 },
  { height: 220, id: "idea-board", width: 160, x: 2760, y: 1580 },
  { height: 600, id: "conference-table", width: 760, x: 3220, y: 1120 },
  { height: 230, id: "meeting-table", width: 960, x: 1600, y: 2340 },
] as const;

export function isOfficeWalkablePosition(position: OfficePosition): boolean {
  if (
    position.x < OFFICE_WALKABLE_BOUNDS.x ||
    position.x > OFFICE_WALKABLE_BOUNDS.x + OFFICE_WALKABLE_BOUNDS.width ||
    position.y < OFFICE_WALKABLE_BOUNDS.y ||
    position.y > OFFICE_WALKABLE_BOUNDS.y + OFFICE_WALKABLE_BOUNDS.height
  ) {
    return false;
  }

  return !OFFICE_COLLISION_AREAS.some((area) => isPointInsideArea(position, area));
}

export function getNearestWalkableOfficePosition(
  position: OfficePosition,
): OfficePosition {
  const boundedPosition = {
    x: clamp(position.x, OFFICE_WALKABLE_BOUNDS.x, OFFICE_WALKABLE_BOUNDS.x + OFFICE_WALKABLE_BOUNDS.width),
    y: clamp(position.y, OFFICE_WALKABLE_BOUNDS.y, OFFICE_WALKABLE_BOUNDS.y + OFFICE_WALKABLE_BOUNDS.height),
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
