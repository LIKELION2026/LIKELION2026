import assert from "node:assert/strict";
import test from "node:test";
import type { OfficeMemberPresence, PublicOfficeTodo } from "@likelion2026/shared";

import { createPeopleContext } from "../src/features/virtual-office/model/people-context.ts";

const minji: OfficeMemberPresence = {
  avatar: { animation: "idle", direction: "down", x: 192, y: 264 },
  avatarId: "office-avatar",
  displayName: "민지",
  language: "ko",
  memberId: "member-minji",
  status: "focused",
  updatedAt: "2026-08-17T09:00:00.000Z"
};

const an: OfficeMemberPresence = {
  avatar: { animation: "idle", direction: "down", x: 672, y: 264 },
  avatarId: "gray-cat",
  displayName: "An",
  language: "vi",
  memberId: "member-an",
  status: "available",
  updatedAt: "2026-08-17T09:00:00.000Z"
};

const publicTodos: PublicOfficeTodo[] = [
  {
    id: "todo-minji",
    isPublic: true,
    memberId: "member-minji",
    memberName: "민지",
    sortOrder: 0,
    status: "in_progress",
    title: "회의 번역 자막 UI 연결"
  },
  {
    id: "todo-an",
    isPublic: true,
    memberId: "member-an",
    memberName: "An",
    sortOrder: 0,
    status: "planned",
    title: "API 응답 필드 확인"
  }
];

test("creates a profile with only the selected member public todos", () => {
  const result = createPeopleContext([minji, an], publicTodos, "member-an");
  const minjiContext = result.find((member) => member.member.memberId === "member-minji");

  assert.deepEqual(minjiContext?.publicTodos, [publicTodos[0]]);
  assert.equal(minjiContext?.isSelf, false);
});

test("marks the current member and sorts the people list by display name", () => {
  const result = createPeopleContext([minji, an], publicTodos, "member-an");

  assert.deepEqual(result.map((member) => member.member.displayName), ["An", "민지"]);
  assert.equal(result[0]?.isSelf, true);
});
