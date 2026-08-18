import type { OfficeMemberPresence, PublicOfficeTodo } from "@likelion2026/shared";

export interface PeopleContextMember {
  isSelf: boolean;
  member: OfficeMemberPresence;
  publicTodos: PublicOfficeTodo[];
}

export function createPeopleContext(
  members: OfficeMemberPresence[],
  publicTodos: PublicOfficeTodo[],
  selfMemberId: string | undefined
): PeopleContextMember[] {
  return members
    .map((member) => ({
      isSelf: member.memberId === selfMemberId,
      member,
      publicTodos: publicTodos.filter((todo) => todo.memberId === member.memberId)
    }))
    .sort((left, right) => left.member.displayName.localeCompare(right.member.displayName));
}
