import type { MeetingRoomSectionId } from "./meeting";

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

export const OFFICE_MEETING_ZONE_LABEL_KEYS = [
  "officeMap.meetingZones.mainMeetingRoom",
  "officeMap.meetingZones.meetingRoom1",
  "officeMap.meetingZones.meetingRoom2",
  "officeMap.meetingZones.meetingRoom3",
] as const;

export type OfficeMeetingZoneLabelKey =
  (typeof OFFICE_MEETING_ZONE_LABEL_KEYS)[number];

export const OFFICE_MEETING_ZONES = [
  {
    height: 594,
    id: "main-meeting-room",
    labelKey: "officeMap.meetingZones.mainMeetingRoom",
    width: 1346,
    x: 1383,
    y: 1838,
  },
  {
    height: 373,
    id: "meeting-zone-1",
    labelKey: "officeMap.meetingZones.meetingRoom1",
    width: 806,
    x: 1064,
    y: 334,
  },
  {
    height: 357,
    id: "meeting-zone-2",
    labelKey: "officeMap.meetingZones.meetingRoom2",
    width: 448,
    x: 1964,
    y: 325,
  },
  {
    height: 349,
    id: "meeting-zone-3",
    labelKey: "officeMap.meetingZones.meetingRoom3",
    width: 541,
    x: 2483,
    y: 337,
  },
] as const;

export type OfficeMeetingZone = (typeof OFFICE_MEETING_ZONES)[number];
export type OfficeMeetingZoneId = OfficeMeetingZone["id"];

export const OFFICE_MEETING_ZONE_SECTION_IDS = {
  "main-meeting-room": "meeting-room",
  "meeting-zone-1": "meeting-room-1",
  "meeting-zone-2": "meeting-room-2",
  "meeting-zone-3": "meeting-room-3",
} as const satisfies Record<OfficeMeetingZoneId, MeetingRoomSectionId>;
