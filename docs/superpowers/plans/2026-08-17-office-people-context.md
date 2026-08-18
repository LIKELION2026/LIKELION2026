# Office People Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 오피스에서 팀원의 공개 협업 맥락을 확인하고 해당 아바타 위치로 카메라를 이동한다.

**Architecture:** 기존 Socket `OfficeMemberPresence[]`와 TODO controller의 `publicTodos`를 클라이언트 순수 표시 모델에서 결합한다. UI는 HUD와 독립 패널로 분리하고, Phaser는 플레이어 위치를 바꾸지 않는 카메라 포커스 메서드만 노출한다.

**Tech Stack:** React, TypeScript, Zustand, Phaser, Node test runner

## Global Constraints

- 타인의 비공개 TODO와 수정 제어를 노출하지 않는다.
- 카메라 이동은 로컬 아바타 좌표와 Socket presence를 변경하지 않는다.
- 기존 TODO API와 Socket 계약을 변경하지 않는다.
- UI는 로딩, 빈 상태, 오류 상태를 구분한다.

---

### Task 1: Team Context Display Model

**Files:**
- Create: `apps/client/src/features/virtual-office/model/people-context.ts`
- Create: `apps/client/test/people-context.test.ts`

**Interfaces:**
- Consumes: `OfficeMemberPresence`, `PublicOfficeTodo`
- Produces: `createPeopleContext(members, publicTodos, selfMemberId): PeopleContextMember[]`

- [x] **Step 1: Write the failing test**

```ts
test("creates a member profile with only that member's public todos", () => {
  const result = createPeopleContext([minji, an], [minjiPublicTodo, anPublicTodo], "an");

  assert.deepEqual(result[0]?.publicTodos, [minjiPublicTodo]);
  assert.equal(result[0]?.isSelf, false);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `../server/node_modules/.bin/tsc --module commonjs --moduleResolution node --target ES2022 --esModuleInterop --skipLibCheck --outDir /tmp/office-people-context --rootDir . test/people-context.test.ts src/features/virtual-office/model/people-context.ts && node --test /tmp/office-people-context/test/people-context.test.js`

Expected: FAIL because `createPeopleContext` does not exist.

- [x] **Step 3: Write minimal implementation**

```ts
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
```

- [x] **Step 4: Run test to verify it passes**

Run: `../server/node_modules/.bin/tsc --module commonjs --moduleResolution node --target ES2022 --esModuleInterop --skipLibCheck --outDir /tmp/office-people-context --rootDir . test/people-context.test.ts src/features/virtual-office/model/people-context.ts && node --test /tmp/office-people-context/test/people-context.test.js`

Expected: PASS.

### Task 2: Camera Focus Boundary

**Files:**
- Modify: `apps/client/src/features/virtual-office/core/office-scene.ts`

**Interfaces:**
- Produces: `OfficeScene.focusMember(x: number, y: number): void`

- [x] **Step 1: Write the implementation boundary**

```ts
focusMember(x: number, y: number): void {
  this.isFollowingLocalAvatar = false;
  this.cameras.main.stopFollow();
  this.cameras.main.pan(x, y, 260, "Quad.easeOut");
}
```

- [x] **Step 2: Verify the boundary through typecheck and manual acceptance criteria**

Run: `corepack pnpm --filter @likelion2026/client typecheck`

Expected: PASS. Browser verification confirms that `찾아가기` changes the camera only and local movement restores follow mode.

### Task 3: People List And Read-Only Profile

**Files:**
- Create: `apps/client/src/features/virtual-office/ui/OfficePeoplePanel.tsx`
- Modify: `apps/client/src/features/virtual-office/ui/OfficeHud.tsx`
- Modify: `apps/client/src/features/virtual-office/ui/VirtualOffice.tsx`
- Modify: `apps/client/src/app/styles.css`

**Interfaces:**
- Consumes: `PeopleContextMember[]`, `OfficeTodoController.error`, `OfficeScene.focusMember`
- Produces: openable people list, selected member profile, and `찾아가기` action

- [x] **Step 1: Implement the panel and wiring**

```tsx
<OfficePeoplePanel
  isOpen={isPeoplePanelOpen}
  members={peopleContext}
  onClose={() => setIsPeoplePanelOpen(false)}
  onFocusMember={(member) => sceneRef.current?.focusMember(member.avatar.x, member.avatar.y)}
  todoError={todoController.error}
/>
```

- [x] **Step 2: Run typecheck and build**

Run: `corepack pnpm --filter @likelion2026/client typecheck && corepack pnpm --filter @likelion2026/client build`

Expected: PASS.

### Task 4: Documentation And Manual Verification

**Files:**
- Modify: `docs/FEATURES/virtual-office/todo-user-scenarios.md`
- Modify: `docs/AI_AGENT_WORKFLOW.md`

- [x] **Step 1: Record actual implementation boundary**

Document the implemented list, profile, focus behavior, privacy rules, and verification result. Do not state a browser result until it is performed.

- [ ] **Step 2: Manual two-browser check**

1. Open `/office` in two browser profiles.
2. Create a public TODO in the first profile.
3. Select that member in the second profile's People panel.
4. Confirm the public TODO appears and `찾아가기` changes only the camera view.
5. Check a no-TODO member and the TODO API error state.
