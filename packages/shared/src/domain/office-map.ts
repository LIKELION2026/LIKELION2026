export const OFFICE_WORLD_SIZE = {
  height: 2804,
  width: 4096,
} as const;

export const OFFICE_DEFAULT_DESKS = [
  { label: "Korea desk 1", positionX: 400, positionY: 1160, zone: "korea-zone" },
  { label: "Korea desk 2", positionX: 400, positionY: 1410, zone: "korea-zone" },
  { label: "Korea desk 3", positionX: 400, positionY: 1660, zone: "korea-zone" },
  { label: "Korea desk 4", positionX: 750, positionY: 1160, zone: "korea-zone" },
  { label: "Korea desk 5", positionX: 750, positionY: 1410, zone: "korea-zone" },
  { label: "Korea desk 6", positionX: 750, positionY: 1660, zone: "korea-zone" },
  { label: "Vietnam desk 1", positionX: 970, positionY: 1160, zone: "vietnam-zone" },
  { label: "Vietnam desk 2", positionX: 970, positionY: 1410, zone: "vietnam-zone" },
  { label: "Vietnam desk 3", positionX: 970, positionY: 1660, zone: "vietnam-zone" },
  { label: "Vietnam desk 4", positionX: 1350, positionY: 1160, zone: "vietnam-zone" },
  { label: "Vietnam desk 5", positionX: 1350, positionY: 1410, zone: "vietnam-zone" },
  { label: "Vietnam desk 6", positionX: 1350, positionY: 1660, zone: "vietnam-zone" },
] as const;

export const OFFICE_MEETING_ZONES = [
  {
    height: 594,
    id: "main-meeting-room",
    label: "회의실 1",
    width: 1346,
    x: 1383,
    y: 1838,
  },
  {
    height: 373,
    id: "meeting-zone-1",
    label: "회의실 1",
    width: 806,
    x: 1064,
    y: 334,
  },
  {
    height: 357,
    id: "meeting-zone-2",
    label: "회의실 2",
    width: 448,
    x: 1964,
    y: 325,
  },
  {
    height: 349,
    id: "meeting-zone-3",
    label: "회의실 3",
    width: 541,
    x: 2483,
    y: 337,
  },
] as const;
