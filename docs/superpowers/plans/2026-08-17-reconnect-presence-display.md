# Reconnect Presence Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 재접속한 사용자의 presence를 `working/active/connected`로 원자적으로 복구해 유령 아바타와 연결 해제 라벨이 남지 않게 한다.

**Architecture:** Client와 Phaser는 `office.snapshot`의 `officePresence`를 그대로 사용한다. Server의 `OfficeService.connectRealtimeMember()`가 재접속 상태 전이의 단일 책임을 가지며, Presence Gateway는 기존 호출 경로를 유지한다. Supabase 업데이트 응답을 snapshot으로 전달한다.

**Tech Stack:** NestJS 11, Supabase REST client, Socket.IO, React 19, Phaser 3, TypeScript, Node test runner.

## Global Constraints

- 관련 Issue는 #90이며 PR 대상은 `dev`다.
- 새 에셋 `gray-cat.webp`는 이번 작업에서 적용하지 않는다.
- `퇴근하기`의 `checked_out/sleeping` 전이는 변경하지 않는다.
- 환경 변수와 실제 guest token은 테스트 출력 또는 Git에 남기지 않는다.

## File Structure

| File | Responsibility |
| --- | --- |
| `apps/server/src/modules/office/office.service.ts` | 재접속 시 working/active/connected presence 전이 |
| `apps/server/test/office.service.test.ts` | 재접속 및 퇴근 상태 회귀 테스트 |
| `docs/FEATURES/virtual-office/reconnect-presence-display.md` | 원인, 실제 검증 결과, 제한 기록 |
| `docs/AI_AGENT_WORKFLOW.md` | AI 조사·검증 기록 |

## Task 1: OfficeService 상태 전이 회귀 테스트

**Files:** Create `apps/server/test/office.service.test.ts`.

**Interfaces:** `OfficeService.connectRealtimeMember(memberId, guestToken): Promise<OfficeMemberPresence>`.

- [x] 테스트용 Supabase query fake를 만들었다. `members` ownership 조회와 `member_presence` update 결과를 분리해 반환한다.
- [x] 실패 테스트를 작성했다. 초기 presence가 `checked_out/ghost/disconnected`일 때 `connectRealtimeMember()` 결과와 저장 payload가 `working/active/connected`인지 검증한다.
- [x] `node --test -r ts-node/register test/office.service.test.ts`를 실행해 현재 코드에서 `attendanceStatus === "checked_out"` 실패를 확인했다.
- [x] 퇴근 상태 전이 테스트를 작성했다. `updateAttendance(..., { attendanceStatus: "checked_out" })` 결과가 `sleeping`을 유지하는지 검증한다.

## Task 2: 재접속 활성화 구현

**Files:** Modify `apps/server/src/modules/office/office.service.ts`.

- [x] `connectRealtimeMember()`에서 `const now = new Date().toISOString()`를 한 번 생성했다.
- [x] `updateRealtimePresence()` payload에 아래 필드를 함께 전달했다.

```ts
{
  attendance_status: "working",
  checked_in_at: now,
  checked_out_at: null,
  connection_status: "connected",
  disconnected_at: null,
  display_mode: "active",
  last_active_at: now,
  last_heartbeat_at: now,
  status_message: "근무 중",
  updated_at: now
}
```

- [x] `disconnectRealtimeMember()`와 `updateAttendance()`의 기존 상태 전이는 변경하지 않았다.
- [x] Task 1의 단위 테스트를 다시 실행해 통과를 확인했다.
- [x] `corepack pnpm --filter @likelion2026/server typecheck`를 실행했다.

## Task 3: 문서와 실제 환경 검증

**Files:** Create `docs/FEATURES/virtual-office/reconnect-presence-display.md`; Modify `docs/AI_AGENT_WORKFLOW.md`.

- [x] `connected/ghost` 상태 집계, 원인, 변경한 상태 전이와 확인 결과를 기록했다.
- [x] `apps/server/.env`를 실제로 읽는 로컬 Nest 서버를 기동했다. 통합 검증은 실제 Supabase와 Socket.IO 연결로 수행했다.
- [x] 검증 guest가 Socket `office.join` 뒤 `working/active/connected`로 저장되고 snapshot에도 같은 값이 오는 것을 확인했다. 검증 후 guest를 삭제했다.
- [x] 서버 전체 테스트 53개, client build, server typecheck, `git diff --check`를 실행했다.

## Planned Commits

1. `test(office): 재접속 presence 상태 회귀 테스트 추가`
2. `fix(presence): 오피스 재접속 시 활성 상태 복구`
3. `docs(virtual-office): 재접속 표시 상태 검증 기록`

## Plan Self-Review

- Acceptance criteria 1과 2는 Task 1, Task 2, Task 3의 단위·실환경 검증으로 연결된다.
- Acceptance criterion 3은 Task 1의 퇴근 상태 테스트와 Task 2의 비변경 범위로 보호한다.
- Acceptance criterion 4는 기존 disconnect 구현을 그대로 두고 Task 3에서 브라우저 흐름으로 확인한다.
- 스프라이트 에셋 적용과 UI 변경은 명시적으로 범위에서 제외했다.
