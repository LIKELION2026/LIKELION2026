import {
  DEFAULT_MEETING_ROOM_SECTION_ID,
  MEETING_ROOM_SECTION_IDS,
  MEETING_ROOM_SECTION_METADATA,
  OFFICE_MEETING_ZONE_SECTION_IDS,
  isMeetingRoomSectionId,
  type MeetingRoomSectionId,
  type OfficeMeetingZoneId,
} from "@likelion2026/shared";

const LAB_MEETING_TEAM_SLUG = "likelion";

export {
  DEFAULT_MEETING_ROOM_SECTION_ID,
  MEETING_ROOM_SECTION_IDS,
  type MeetingRoomSectionId,
};

export interface MeetingRoomSection {
  id: MeetingRoomSectionId;
  label: string;
  roomName: string;
}

export function resolveMeetingRoomSection(
  search: string,
  date = new Date()
): MeetingRoomSection {
  const query = new URLSearchParams(search);
  const sectionId = normalizeMeetingRoomSectionId(query.get("section"));
  return createMeetingRoomSection(
    sectionId ?? DEFAULT_MEETING_ROOM_SECTION_ID,
    date
  );
}

export function createMeetingRoomSection(
  sectionId: MeetingRoomSectionId,
  date = new Date()
): MeetingRoomSection {
  const metadata = MEETING_ROOM_SECTION_METADATA[sectionId];

  return {
    id: sectionId,
    label: metadata.label,
    roomName: createLabMeetingRoomName(metadata.roomSlug, date)
  };
}

export function createMeetingRoomSectionByOfficeZoneId(
  zoneId: OfficeMeetingZoneId,
  date = new Date()
): MeetingRoomSection {
  return createMeetingRoomSection(
    OFFICE_MEETING_ZONE_SECTION_IDS[zoneId],
    date
  );
}

function createLabMeetingRoomName(roomSlug: string, date: Date): string {
  return `lab-${LAB_MEETING_TEAM_SLUG}-${formatDateStamp(date)}-${roomSlug}`;
}

function formatDateStamp(date: Date): string {
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  return `${year}${month}${day}`;
}

function normalizeMeetingRoomSectionId(
  value: string | null
): MeetingRoomSectionId | undefined {
  if (!value) {
    return undefined;
  }

  const normalizedValue = value.trim().toLowerCase();
  if (isMeetingRoomSectionId(normalizedValue)) {
    return normalizedValue;
  }

  return undefined;
}
