# Gray Cat Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 새로 생성한 게스트만 gray-cat 아바타로 표시하고, 기존 게스트의 판다 보행 애니메이션은 유지한다.

**Architecture:** 서버는 신규 게스트의 영속 `members.avatar_id`를 `gray-cat`으로 선택하고, Socket 계약의 `OfficeMemberPresence`에 `avatarId`를 포함한다. Phaser는 `avatarId`별 정의를 통해 기존 표준 시트와 gray-cat 원본 아틀라스를 별도로 렌더링하며, gray-cat은 원본에서 확인한 4개 정지 포즈로 방향만 전환한다.

**Tech Stack:** NestJS, Supabase, Socket.IO, React, Phaser, TypeScript, Node test runner.

## Global Constraints

- 기존에 저장된 `office-avatar-*` 값은 변경하지 않는다.
- 신규 게스트만 `gray-cat`을 받는다.
- gray-cat은 현재 `1619 x 971` 원본 아틀라스이므로 보행 프레임을 추정하지 않는다.
- 공통 Socket 계약은 `packages/shared`에서 관리한다.
- PR은 `dev`를 대상으로 하고 `Closes #92`를 포함한다.

---

### Task 1: 신규 게스트 아바타 선택 규칙

**Files:**
- Create: `apps/server/src/modules/office/office-avatar.ts`
- Create: `apps/server/test/office-avatar.test.ts`
- Modify: `apps/server/src/modules/office/office.service.ts`

**Interfaces:**
- Produces: `GRAY_CAT_AVATAR_ID`, `selectNewGuestAvatarId(): string`
- Consumes: `createMember()`의 `avatar_id`

- [x] **Step 1: gray-cat 선택을 요구하는 실패 테스트를 작성한다.**

```ts
test("selectNewGuestAvatarId returns gray-cat for a new guest", () => {
  assert.equal(selectNewGuestAvatarId(), GRAY_CAT_AVATAR_ID);
});
```

- [x] **Step 2: 테스트가 모듈 부재로 실패하는지 확인한다.**

Run: `corepack pnpm exec ts-node --test apps/server/test/office-avatar.test.ts`

- [x] **Step 3: 최소 선택 모듈을 구현하고 `createMember`가 사용하게 한다.**

```ts
export const GRAY_CAT_AVATAR_ID = "gray-cat";
export function selectNewGuestAvatarId(): string {
  return GRAY_CAT_AVATAR_ID;
}
```

- [x] **Step 4: 서버 선택 테스트를 통과시킨다.**

Run: `corepack pnpm exec ts-node --test apps/server/test/office-avatar.test.ts`

### Task 2: 실시간 멤버 계약에 아바타 식별자 전달

**Files:**
- Modify: `packages/shared/src/domain/member.ts`
- Modify: `apps/server/src/modules/office/office.service.ts`

**Interfaces:**
- Produces: `OfficeMemberPresence.avatarId: string`
- Consumes: `MemberRow.avatar_id`

- [x] **Step 1: `OfficeMemberPresence`에 `avatarId`를 추가한다.**
- [x] **Step 2: `toRealtimeMember()`가 DB의 `avatar_id`를 전달한다.**
- [x] **Step 3: 공유 패키지와 서버를 typecheck한다.**

Run: `corepack pnpm --filter @likelion2026/shared typecheck && corepack pnpm --filter @likelion2026/server typecheck`

### Task 3: avatarId별 Phaser 프리뷰 렌더링

**Files:**
- Create: `apps/client/src/features/virtual-office/core/avatar-sprite-definition.ts`
- Modify: `apps/client/src/features/virtual-office/core/office-scene.ts`
- Modify: `apps/client/src/features/virtual-office/ui/VirtualOffice.tsx`

**Interfaces:**
- Consumes: `OfficeMemberPresence.avatarId`, `GuestOfficeSessionResponse.member.avatarId`
- Produces: 기존 보행 시트 및 gray-cat 4방향 정지 포즈를 선택하는 `getAvatarSpriteDefinition()`

- [x] **Step 1: 표준 아바타와 gray-cat의 에셋 경로, 프레임, 방향 규칙을 정의한다.**
- [x] **Step 2: 씬 preload 단계에서 필요한 텍스처와 정규화 프레임을 생성한다.**
- [x] **Step 3: 로컬 세션의 `avatarId`를 적용하고, 원격 멤버는 이벤트의 `avatarId`로 스프라이트를 만든다.**
- [x] **Step 4: gray-cat 이동에는 동일 방향 정지 프레임을 사용한다.**
- [x] **Step 5: 클라이언트 typecheck와 build를 통과시킨다.**

Run: `corepack pnpm --filter @likelion2026/client typecheck && corepack pnpm --filter @likelion2026/client build`

### Task 4: 에셋 한계와 수동 검증 기록

**Files:**
- Create: `docs/FEATURES/virtual-office/avatar-preview.md`

**Interfaces:**
- Documents: 현재 gray-cat 프리뷰 범위와 표준 보행 시트 전환 조건

- [x] **Step 1: 신규/기존 게스트의 검증 절차와 확인 결과를 기록한다.**
- [x] **Step 2: `1619 x 971` 원본을 표준 `6 x 4`, `256px` 시트로 교체할 때 필요한 조건을 명시한다.**

### Task 5: 전체 회귀 검증

- [x] **Step 1: 서버 아바타 선택 테스트를 다시 실행한다.**
- [x] **Step 2: 전체 typecheck와 client build를 실행한다.**
- [ ] **Step 3: 새 브라우저 프로필로 게스트를 만들고 gray-cat의 로컬/원격 표시와 방향 전환을 확인한다.**
- [ ] **Step 4: 기존 guestToken으로 재입장해 기존 아바타가 유지되는지 확인한다.**

## Self-Review

- 기존 계정의 DB 값은 수정하지 않으므로 기존 외형은 유지된다.
- 서버가 모든 실시간 멤버 페이로드에 `avatarId`를 실어 원격 렌더링도 같은 에셋을 선택한다.
- gray-cat은 검증되지 않은 보행 프레임을 만들지 않고 정지 포즈 프리뷰로 범위를 제한한다.
