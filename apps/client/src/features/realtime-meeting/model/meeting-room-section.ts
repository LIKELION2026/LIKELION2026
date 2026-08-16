export const DEFAULT_MEETING_ROOM_SECTION_ID = "meeting-room";

const LAB_MEETING_TEAM_SLUG = "likelion";

export const MEETING_ROOM_SECTION_IDS = [
  "meeting-room",
  "shared-collaboration-zone",
  "korea-team-zone",
  "vietnam-team-zone"
] as const;

export type MeetingRoomSectionId = (typeof MEETING_ROOM_SECTION_IDS)[number];

interface MeetingRoomSectionMetadata {
  label: string;
  roomSlug: string;
}

export interface MeetingRoomSection {
  id: MeetingRoomSectionId;
  label: string;
  roomName: string;
}

const MEETING_ROOM_SECTION_METADATA: Record<
  MeetingRoomSectionId,
  MeetingRoomSectionMetadata
> = {
  "korea-team-zone": {
    label: "Korea Team Zone",
    roomSlug: "korea-team"
  },
  "meeting-room": {
    label: "Meeting Room",
    roomSlug: "meeting-room"
  },
  "shared-collaboration-zone": {
    label: "Shared Collaboration Zone",
    roomSlug: "shared-collab"
  },
  "vietnam-team-zone": {
    label: "Vietnam Team Zone",
    roomSlug: "vietnam-team"
  }
};

export function resolveMeetingRoomSection(search: string): MeetingRoomSection {
  const query = new URLSearchParams(search);
  const sectionId = normalizeMeetingRoomSectionId(query.get("section"));
  return createMeetingRoomSection(sectionId ?? DEFAULT_MEETING_ROOM_SECTION_ID);
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
  if (
    MEETING_ROOM_SECTION_IDS.includes(normalizedValue as MeetingRoomSectionId)
  ) {
    return normalizedValue as MeetingRoomSectionId;
  }

  return undefined;
}
