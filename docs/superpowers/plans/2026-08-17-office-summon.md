# Office Summon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 피플 목록의 찾아가기와 호출 요청을 통해 팀원이 동의한 경우에만 같은 오피스 내 아바타 위치를 이동한다.

**Architecture:** 기존 `/office` Socket namespace와 `PresenceGateway`의 Socket별 connection record를 사용한다. 호출 요청은 Server 메모리에 30초 동안만 보관하고, 수락 시점에 PresenceService가 가진 요청자의 최신 avatar 좌표를 대상 Client에 전달한다. 실제 위치 동기화는 기존 `presence.move`가 담당한다.

**Tech Stack:** React, Phaser 3, Socket.IO, NestJS WebSocket Gateway, pnpm monorepo, Node test runner

## Global Constraints

- 호출 요청은 같은 workspace에 연결된 멤버 사이에서만 허용한다.
- 대상만 요청을 수락 또는 거절할 수 있다.
- 수락 전과 거절·만료·연결 해제 시에는 아바타 위치를 변경하지 않는다.
- `presence.move`가 위치 전파의 단일 경로이며 호출 이벤트는 좌표 동의와 전달만 담당한다.
- 요청과 응답에는 사용자 입력 텍스트나 비공개 TODO 데이터를 넣지 않는다.

---

### Task 1: Shared 호출 Socket 계약

**Files:**
- Modify: `packages/shared/src/constants/socket-events.ts`
- Create: `packages/shared/src/contracts/socket/office-summon.ts`
- Modify: `packages/shared/src/contracts/socket/events.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `apps/server/test/presence.gateway.test.ts`

**Interfaces:**
- Produces: `OfficeSummonRequestPayload`, `OfficeSummonRequestedPayload`, `OfficeSummonRespondPayload`, `OfficeSummonResolvedPayload`
- Produces: `office.summon.request`, `office.summon.requested`, `office.summon.respond`, `office.summon.resolved`

- [ ] **Step 1: Write the failing gateway test**

```ts
gateway.handleSummonRequest(asSocket(requester), { targetMemberId: "member-b" });
assert.equal(target.sent[0]?.eventName, SOCKET_EVENT_NAMES.OFFICE_SUMMON_REQUESTED);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node -r ts-node/register --test test/presence.gateway.test.ts`

Expected: the summon event name or gateway handler is missing.

- [ ] **Step 3: Add contracts and event map entries**

```ts
export interface OfficeSummonRespondPayload {
  decision: "accepted" | "declined";
  requestId: string;
}
```

- [ ] **Step 4: Run shared and server typecheck**

Run: `corepack pnpm --filter @likelion2026/shared typecheck && corepack pnpm --filter @likelion2026/server typecheck`

Expected: PASS.

### Task 2: Server 요청 검증과 결과 전송

**Files:**
- Modify: `apps/server/src/modules/presence/presence.service.ts`
- Modify: `apps/server/src/modules/presence/presence.gateway.ts`
- Test: `apps/server/test/presence.gateway.test.ts`
- Test: `apps/server/test/presence.service.test.ts`

**Interfaces:**
- Consumes: Task 1의 summon 계약
- Produces: `PresenceService.createSummonRequest()`, `PresenceService.respondToSummonRequest()`

- [ ] **Step 1: Write failing tests**

```ts
await gateway.handleSummonRespond(asSocket(target), { decision: "accepted", requestId });
assert.deepEqual(targetResolution.targetPosition, requester.avatar);
```

- [ ] **Step 2: Run tests to verify failure**

Run: `node -r ts-node/register --test test/presence.gateway.test.ts test/presence.service.test.ts`

Expected: accept handler and request lifecycle are missing.

- [ ] **Step 3: Implement in-memory request lifecycle**

```ts
type SummonRequest = {
  expiresAt: number;
  requestId: string;
  requesterMemberId: string;
  requesterSocketId: string;
  targetMemberId: string;
  targetSocketId: string;
  teamId: string;
};
```

- [ ] **Step 4: Register 30-second expiry and disconnect cleanup**

```ts
const SUMMON_REQUEST_TTL_MS = 30_000;
setTimeout(() => this.expireSummonRequest(requestId), SUMMON_REQUEST_TTL_MS);
```

- [ ] **Step 5: Run server tests**

Run: `corepack pnpm --filter @likelion2026/server test`

Expected: PASS, including request, accept, decline, and expiry behavior.

### Task 3: Client 이동 명령과 호출 Socket 수신

**Files:**
- Modify: `apps/client/src/features/virtual-office/model/use-office-socket.ts`
- Modify: `apps/client/src/features/virtual-office/ui/VirtualOffice.tsx`
- Modify: `apps/client/src/features/virtual-office/core/office-scene.ts`
- Test: `apps/client/test/office-store.test.ts`

**Interfaces:**
- Consumes: `OfficeSummonRequestedPayload`, `OfficeSummonResolvedPayload`
- Produces: `sendSummonRequest(targetMemberId)`, `respondToSummon(requestId, decision)`, `moveTo(x, y)`

- [ ] **Step 1: Write failing movement test**

```ts
useOfficeStore.getState().updateSelfPosition({ animation: "idle", direction: "down", x: 480, y: 320 });
assert.equal(useOfficeStore.getState().self?.avatar.x, 480);
```

- [ ] **Step 2: Run test to verify failure**

Run: `node --test /tmp/office-store-summon/test/office-store.test.js`

Expected: missing move helper or missing expected state update.

- [ ] **Step 3: Implement local teleport and movement publish**

```ts
scene.moveLocalAvatarTo(x, y);
sendMove({ animation: "idle", direction: currentDirection, x, y });
```

- [ ] **Step 4: Subscribe to summon events**

```ts
socket.on(SOCKET_EVENT_NAMES.OFFICE_SUMMON_REQUESTED, setPendingSummon);
socket.on(SOCKET_EVENT_NAMES.OFFICE_SUMMON_RESOLVED, handleSummonResolution);
```

- [ ] **Step 5: Run client typecheck**

Run: `corepack pnpm --filter @likelion2026/client typecheck`

Expected: PASS.

### Task 4: 피플 패널 호출 UI와 수신 모달

**Files:**
- Modify: `apps/client/src/features/virtual-office/ui/OfficePeoplePanel.tsx`
- Create: `apps/client/src/features/virtual-office/ui/OfficeSummonModal.tsx`
- Modify: `apps/client/src/app/styles.css`
- Modify: `apps/client/src/features/virtual-office/ui/VirtualOffice.tsx`

**Interfaces:**
- Consumes: Task 3의 `sendSummonRequest`, `respondToSummon`, pending summon state
- Produces: 피플 패널의 `불러오기`와 수신 모달의 `거절`, `이동하기`

- [ ] **Step 1: Add summon action to the selected member profile**

```tsx
<button onClick={() => onRequestSummon(context.member.memberId)} type="button">
  불러오기
</button>
```

- [ ] **Step 2: Add an accessible request modal**

```tsx
<div aria-modal="true" role="dialog">
  <p>{request.requesterName}가 당신을 불러오기를 원합니다.</p>
  <button onClick={onDecline}>거절</button>
  <button onClick={onAccept}>이동하기</button>
</div>
```

- [ ] **Step 3: Add pending and result UI states**

```text
요청 전송됨 / 상대가 거절했습니다 / 요청이 만료되었습니다
```

- [ ] **Step 4: Run production build**

Run: `corepack pnpm --filter @likelion2026/client build`

Expected: PASS.

### Task 5: 사용자 시나리오와 회귀 검증 기록

**Files:**
- Modify: `docs/FEATURES/virtual-office/user-scenarios.md`
- Modify: `docs/FEATURES/virtual-office/realtime-presence.md`
- Modify: `docs/AI_AGENT_WORKFLOW.md`

**Interfaces:**
- Consumes: Task 1-4의 최종 이벤트와 UI 흐름
- Produces: 호출·수락·거절·만료 검증 시나리오

- [ ] **Step 1: Add browser verification cases**

```text
SU-01: A가 B에게 찾아가기 → A 위치가 B 위치로 동기화
SU-02: A가 B를 호출, B 수락 → B가 A 최신 위치로 이동
SU-03: B 거절 또는 30초 만료 → 이동 없음
```

- [ ] **Step 2: Record automated validation commands and results**

```text
corepack pnpm --filter @likelion2026/server test
corepack pnpm --filter @likelion2026/client build
```

- [ ] **Step 3: Run whitespace validation**

Run: `git diff --check`

Expected: PASS.

## Plan Self-Review

- Spec coverage: 찾아가기, 요청, 수락, 거절, 만료, workspace 경계, 문서 및 검증을 Task 1-5에 각각 배치했다.
- Placeholder scan: 구현 대상 event, interface, 테스트 명령과 완료 기준을 명시했다.
- Type consistency: 모든 Socket event는 shared 계약에서 정의한 뒤 Server와 Client가 사용한다. 위치 이동은 기존 `presence.move` 단일 경로를 사용한다.
