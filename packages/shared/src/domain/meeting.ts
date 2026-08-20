import type { LanguageCode } from "./language";

export const DEFAULT_MEETING_ROOM_SECTION_ID = "meeting-room";

export const MEETING_ROOM_SECTION_IDS = [
  "meeting-room",
  "meeting-room-1",
  "meeting-room-2",
  "meeting-room-3",
] as const;

export type MeetingRoomSectionId = (typeof MEETING_ROOM_SECTION_IDS)[number];

export interface MeetingRoomSectionMetadata {
  label: string;
  roomSlug: string;
}

export const MEETING_ROOM_SECTION_METADATA = {
  "meeting-room": {
    label: "Meeting Room",
    roomSlug: "meeting-room",
  },
  "meeting-room-1": {
    label: "Meeting Room 1",
    roomSlug: "meeting-room-1",
  },
  "meeting-room-2": {
    label: "Meeting Room 2",
    roomSlug: "meeting-room-2",
  },
  "meeting-room-3": {
    label: "Meeting Room 3",
    roomSlug: "meeting-room-3",
  },
} as const satisfies Record<MeetingRoomSectionId, MeetingRoomSectionMetadata>;

export interface MeetingParticipant {
  participantIdentity: string;
  participantName: string;
  preferredLanguage: LanguageCode;
}

export interface MeetingRoom {
  roomName: string;
  title?: string;
  createdAt: string;
}

export function isMeetingRoomSectionId(
  value: string
): value is MeetingRoomSectionId {
  return MEETING_ROOM_SECTION_IDS.includes(value as MeetingRoomSectionId);
}
