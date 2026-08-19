export const OFFICE_WORLD_SIZE = {
  height: 2804,
  width: 4096,
} as const;

export const OFFICE_DEFAULT_DESKS = [
  { label: "Korea desk 1", positionX: 400, positionY: 1160, zone: "korea-zone" },
  { label: "Korea desk 2", positionX: 400, positionY: 1410, zone: "korea-zone" },
  { label: "Korea desk 3", positionX: 400, positionY: 1660, zone: "korea-zone" },
  { label: "Vietnam desk 1", positionX: 970, positionY: 1160, zone: "vietnam-zone" },
  { label: "Vietnam desk 2", positionX: 970, positionY: 1410, zone: "vietnam-zone" },
  { label: "Vietnam desk 3", positionX: 970, positionY: 1660, zone: "vietnam-zone" },
] as const;

export const OFFICE_MEETING_ZONE = {
  height: 580,
  width: 1320,
  x: 1380,
  y: 2110,
} as const;
