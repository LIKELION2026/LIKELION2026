# Remote Movement Ordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 늦게 완료된 DB 저장이 원격 아바타의 최신 위치를 과거 좌표로 되돌리지 않게 하고, 원격 Client가 순서가 역전된 이동 이벤트를 폐기한다.

**Architecture:** Phaser는 로컬 입력과 physics 이동만 담당한다. Socket Client는 연결별 sequence를 부여하고 Gateway는 받은 이동을 즉시 중계한다. PresenceService는 DB 저장을 최신 위치 기준의 비동기 작업으로 분리한다. 수신 Client는 member별 마지막 sequence보다 작거나 같은 이벤트를 Store에 전달하지 않는다.

**Tech Stack:** React 19, Phaser 3, Socket.IO, NestJS, Supabase, TypeScript, Node test runner.

## Global Constraints

- `presence.move`는 최대 60ms 간격을 유지한다.
- DB 위치 영속화는 최소 1초 간격으로 최신 위치만 저장한다.
- Socket 중계는 Supabase 응답을 기다리지 않는다.
- `sequence`는 Socket 연결별 증가값이며 `office.member.joined` 수신 시 member 기준값을 초기화한다.
- DB 응답은 최신 실시간 위치·방향·animation을 덮어쓰지 않는다.
- 변경은 Issue #87과 연결하며 PR 대상 브랜치는 `dev`다.

## File Structure

| 파일 | 책임 |
| --- | --- |
| `packages/shared/src/contracts/socket/presence.ts` | wire 이동 이벤트의 `sequence` 계약 |
| `apps/client/src/features/virtual-office/model/use-office-socket.ts` | 송신 sequence 발급, 수신 과거 이벤트 폐기 |
| `apps/client/src/features/virtual-office/core/office-scene.ts` | 순번 없는 로컬 이동 명령을 callback으로 전달 |
| `apps/server/src/modules/presence/presence.service.ts` | 최신 위치 비동기 영속화와 connection 상태 보호 |
| `apps/server/src/modules/presence/presence.gateway.ts` | 즉시 Socket 중계와 payload 검증 |
| `apps/server/test/presence.service.test.ts` | 느린 DB 저장 중 최신 위치 보존 테스트 |
| `apps/server/test/presence.gateway.test.ts` | DB 저장 완료를 기다리지 않는 중계 테스트 |
| `docs/FEATURES/virtual-office/realtime-presence.md` | 구현 결과와 회귀 검증 기록 |

## Task 1: 이동 sequence 계약과 Client 송수신 경계

**Files:** `packages/shared/src/contracts/socket/presence.ts`, `apps/client/src/features/virtual-office/core/office-scene.ts`, `apps/client/src/features/virtual-office/model/use-office-socket.ts`.

**Interfaces:** `PresenceMovePayload`에 `sequence: number`를 추가한다. `LocalMovementCommand = Omit<PresenceMovePayload, "sequence">`를 shared에 export한다. Scene callback은 `LocalMovementCommand`를 전달하고 Socket hook만 wire payload에 sequence를 부여한다.

- [x] 영향 범위를 `rg -n "PresenceMovePayload|PresenceMovedPayload" packages/shared apps/client apps/server`로 확인한다.
- [x] `PresenceMovePayload`에 `sequence`를 추가하고 `PresenceMovedPayload`가 같은 값을 확장하도록 한다.
- [x] `useOfficeSocket`에 `nextMoveSequenceRef = useRef(0)`과 `lastReceivedSequenceRef = useRef(new Map<string, number>())`를 둔다.
- [x] `sendMove(command)`은 `socket.emit` 직전에 `{ ...command, sequence: nextMoveSequenceRef.current++ }`를 전송한다.
- [x] `handleMemberMoved(payload)`은 member의 마지막 sequence가 payload sequence 이상이면 return하고, 그 외에만 `updateMemberPosition(payload)`을 호출한다.
- [x] `handleMemberJoined`, `handleMemberLeft`, Socket cleanup에서 해당 또는 전체 member sequence 기준을 삭제한다.
- [x] `corepack pnpm --filter @likelion2026/shared typecheck`와 `corepack pnpm --filter @likelion2026/client typecheck`를 실행한다.
- [ ] `fix(socket): 원격 이동 이벤트 순번 검증 추가` 커밋을 만든다.

## Task 2: Server 중계와 위치 영속화 분리

**Files:** `apps/server/src/modules/presence/presence.service.ts`, `apps/server/src/modules/presence/presence.gateway.ts`, `apps/server/test/presence.service.test.ts`, `apps/server/test/presence.gateway.test.ts`.

**Interfaces:** `PresenceService.move(socketId, payload)`는 최신 `OfficeMemberPresence`를 DB 응답 없이 즉시 반환한다. Gateway는 이 반환값을 즉시 `presence.moved`로 중계한다. `ConnectionRecord`에는 `lastPersistStartedAt`, `persisting`, `persistenceScheduled`를 추가한다.

- [x] `presence.service.test.ts`에 deferred Promise fake를 추가해, due 상태의 저장 Promise가 pending이어도 `move()`가 즉시 반환하는 회귀 테스트를 작성했다.
- [ ] 새 `presence.gateway.test.ts`에서 지연된 저장 Promise를 주입하고, `handlePresenceMove` 호출 직후 fake Socket server에 sequence와 x가 기록되는 테스트를 작성한다. 현재 service 회귀 테스트와 전체 서버 테스트로 Gateway의 동기 중계 경로를 검증했으며, 별도 gateway 단위 테스트는 후속 보강 항목으로 남긴다.
- [x] `move()`는 `connection.member = withAvatar(connection.member, payload)` 뒤 `schedulePositionPersistence(socketId)`를 호출하고 즉시 member를 반환하게 했다.
- [x] 저장 예약은 실행 중이면 `persistenceScheduled = true`만 유지한다. 저장 시작 전에 `lastPersistStartedAt`을 갱신해 중복 저장을 막는다.
- [x] 실제 저장은 시작 시점의 최신 avatar 복사본 하나만 Supabase로 보낸다. Promise 완료 뒤 DB가 반환한 member로 `connection.member`를 바꾸지 않는다.
- [x] 저장 완료 뒤 `persistenceScheduled`가 true이면 다음 1초 주기에 최신 avatar 하나만 저장한다.
- [x] `isPresenceMovePayload`은 `Number.isSafeInteger(sequence) && sequence >= 0`을 검증한다. Gateway는 받은 sequence를 변경하지 않고 room에 emit한다.
- [x] `corepack pnpm --filter @likelion2026/server test`에 해당하는 전체 Node test와 server typecheck를 실행한다.
- [ ] `fix(presence): 이동 중계와 위치 영속화 분리` 커밋을 만든다.

## Task 3: 원격 보간 회귀 검증과 문서 갱신

**Files:** `docs/FEATURES/virtual-office/realtime-presence.md`, `docs/FEATURES/virtual-office/remote-movement-debugging.md`, `docs/AI_AGENT_WORKFLOW.md`, `docs/RUNBOOKS/production-test-scenarios.md`.

- [ ] `realtime-presence.md`에 `input → sequence → immediate Socket emit → sequence guard → 120ms interpolation → 1초 latest-only DB persist` pipeline을 기록한다.
- [x] `remote-movement-debugging.md` 상태를 구현 결과와 실제 환경 변수·서버 기동 검증 결과에 맞게 갱신했다.
- [ ] Production Runbook에 두 브라우저 10초 직선 이동과 5회 방향 전환 회귀 시나리오를 추가한다.
- [ ] shared typecheck, client typecheck/build, server test/typecheck, `git diff --check`를 실행한다.
- [ ] 일반 창과 시크릿 창에서 양방향 이동을 검증하고 실제 결과를 Issue #87과 PR에 기록한다. 현재 Supabase에 빈 desk가 없어 새 두 세션을 만들 수 없으므로, desk 정리 또는 테스트 workspace 준비 후 수행한다.
- [ ] `docs(virtual-office): 원격 이동 순서 보장 검증 기록` 커밋을 만든다.

## Plan Self-Review

- Issue #87의 재현, 원인 문서화, 중계·영속화 분리, 과거 패킷 테스트, 2인 검증을 Task 1~3에 연결했다.
- wire payload는 `PresenceMovePayload.sequence`, Scene 입력은 `LocalMovementCommand`, 수신 guard는 `PresenceMovedPayload.sequence`을 사용한다.
- 서버 authoritative movement, prediction, 동적 delay 조정은 이 계획에서 제외한다.

## Execution Handoff

문서 기록 커밋 후 Task 1부터 한 task씩 구현하고, 각 task의 테스트·PR 검토를 완료한 뒤 다음 task로 진행한다.
