import { create } from "zustand";
import type {
  MemberStatus,
  OfficeMemberPresence,
  PresenceMovedPayload
} from "@likelion2026/shared";

export type OfficeConnectionState =
  | "connected"
  | "connecting"
  | "disconnected"
  | "reconnecting";

interface OfficeState {
  connectionState: OfficeConnectionState;
  members: OfficeMemberPresence[];
  self: OfficeMemberPresence | null;
  setConnectionState: (connectionState: OfficeConnectionState) => void;
  setSnapshot: (self: OfficeMemberPresence, members: OfficeMemberPresence[]) => void;
  upsertMember: (member: OfficeMemberPresence) => void;
  removeMember: (memberId: string) => void;
  updateMemberPosition: (payload: PresenceMovedPayload) => void;
  updateMemberStatus: (member: OfficeMemberPresence) => void;
}

export const useOfficeStore = create<OfficeState>((set) => ({
  connectionState: "connecting",
  members: [],
  self: null,
  removeMember: (memberId) =>
    set((state) => ({
      members: state.members.filter((member) => member.memberId !== memberId)
    })),
  setConnectionState: (connectionState) => set({ connectionState }),
  setSnapshot: (self, members) => set({ members, self }),
  updateMemberPosition: (payload) =>
    set((state) => ({
      members: state.members.map((member) =>
        member.memberId === payload.memberId
          ? {
              ...member,
              avatar: {
                animation: payload.animation,
                direction: payload.direction,
                x: payload.x,
                y: payload.y
              },
              updatedAt: payload.occurredAt
            }
          : member
      )
    })),
  updateMemberStatus: (member) =>
    set((state) => ({
      members: upsert(state.members, member),
      self: state.self?.memberId === member.memberId ? member : state.self
    })),
  upsertMember: (member) =>
    set((state) => ({
      members: upsert(state.members, member)
    }))
}));

function upsert(
  members: OfficeMemberPresence[],
  nextMember: OfficeMemberPresence
): OfficeMemberPresence[] {
  const exists = members.some((member) => member.memberId === nextMember.memberId);
  if (!exists) {
    return [...members, nextMember];
  }

  return members.map((member) =>
    member.memberId === nextMember.memberId ? nextMember : member
  );
}

export const OFFICE_STATUS_OPTIONS: MemberStatus[] = [
  "available",
  "focused",
  "in_meeting",
  "away"
];
