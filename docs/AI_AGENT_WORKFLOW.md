# AI Agent Workflow

> 작성자: Project Team
>
> 마지막 업데이트: 2026-08-15

## 목적

팀은 AI Agent를 문서화, 코드 탐색, 구현 보조, 테스트 설계에 활용한다. 이 문서는 AI가 무엇을 대신 결정했는지가 아니라, 팀원이 어떤 맥락에서 AI 결과를 검토하고 반영했는지 기록한다.

## 프로젝트 내 Agent 환경

| 구성 | 역할 |
| --- | --- |
| `AGENTS.md` | 모든 코딩 Agent가 따르는 공통 제품·안전·작업 규칙 |
| `CLAUDE.md` | Claude Code 실행 시 읽는 프로젝트 규칙 |
| `.agents/skills/project-workflow` | 기능 기획·구현·검증·기록 절차를 담은 프로젝트 Skill |
| `docs/CONVENTIONS.md` | GitHub 협업과 monorepo 작업 규칙 |

## 사용 원칙

- AI 출력은 초안이며, 담당 팀원이 제품 요구사항과 코드 품질을 검토한다.
- AI가 만든 코드와 문서는 실제 실행·수정·검증 후 반영한다.
- AI 사용 사실을 부풀리거나, 사람이 하지 않은 작업을 수행한 것처럼 기록하지 않는다.
- API 키, 사용자 정보, 회의 녹취 원본 등 민감 정보는 Agent 입력과 로그에서 제외한다.

## 작업 기록 템플릿

```md
### YYYY-MM-DD - 작업 제목

- 담당자:
- 사용한 Agent / Skill:
- 사용 목적:
- 입력 맥락:
- AI 제안 또는 산출물:
- 팀원 검토·수정 내용:
- 검증 결과:
- 관련 Issue / PR / Discussion:
```

## 기록 예시

```md
### YYYY-MM-DD - 공통 이벤트 타입 설계

- 담당자: 예시 담당자
- 사용한 Agent / Skill: Project Workflow Skill
- 사용 목적: Client와 Server가 공유할 이벤트 타입 초안 설계
- 입력 맥락: 기능 요구사항과 상태 동기화 요구사항
- AI 제안 또는 산출물: DTO와 Socket 이벤트 후보
- 팀원 검토·수정 내용: 프로젝트 요구사항에 맞는 필드 추가 및 불필요한 필드 제거
- 검증 결과: 관련 타입과 기능 동작 확인
- 관련 Issue / PR / Discussion: 링크 추가
```

### 2026-08-15 - NestJS 백엔드 모노레포 초기 세팅

- 담당자: 사용자 검토 예정
- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: 백엔드 초기 세팅 범위 정리, GitHub 이슈 생성, shared 계약과 NestJS 서버 구조 초안 작성
- 입력 맥락: `docs/PRD.md`, `docs/STRUCTURE.md`, `docs/FEATURES/realtime-meeting/README.md`, 사용자 요청
- AI 제안 또는 산출물: pnpm workspace, `packages/shared` 계약, `apps/server` NestJS 설정, LiveKit 토큰 API 경계, 로컬 실행 Runbook
- 팀원 검토·수정 내용: 사용자가 커밋 계획을 승인해 목적별 커밋으로 반영
- 검증 결과: `pnpm.cmd typecheck`, `pnpm.cmd build`, 더미 LiveKit 환경변수를 사용한 `GET /health`와 `POST /meeting/token` 수동 확인 통과
- 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/2

### 2026-08-15 - LiveKit 회의 P0 파이프라인 문서화

- 담당자: 사용자 검토 예정
- 사용한 Agent / Skill: Codex / Project Workflow Skill, GitHub Skill
- 사용 목적: LiveKit Cloud 기반 회의 입장과 자막 Mock 검증 범위를 AI Agent 연결 전 단계로 분리하고, 구현 이슈와 파이프라인 문서를 연결
- 입력 맥락: 사용자 파이프라인 이미지, `docs/PRD.md`, `docs/FEATURES/realtime-meeting/README.md`, `packages/shared/src/contracts/socket/subtitle.ts`
- AI 제안 또는 산출물: GitHub Issue #6, `docs/FEATURES/realtime-meeting/PIPELINE.md`, README의 관련 Issue와 Pipeline 링크 갱신
- 팀원 검토·수정 내용: 사용자 요청에 따라 실제 STT, Translation Agent, Meeting AI Agent 연결은 후속 범위로 제외
- 검증 결과: 문서 변경 사항과 GitHub 이슈 생성 확인
- 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/6

### 2026-08-15 - 회의 자막 Shared 계약 정리

- 담당자: 사용자 검토 예정
- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: Client와 Server가 동일한 socket event 이름과 자막 payload 타입을 사용하도록 P0 계약 확정
- 입력 맥락: Issue #6, `docs/FEATURES/realtime-meeting/PIPELINE.md`, `packages/shared/src/contracts/socket/subtitle.ts`, `packages/shared/src/constants/socket-events.ts`
- AI 제안 또는 산출물: `SocketEventPayloadMap`, `SocketEventPayload` 타입, `SUBTITLE_UPDATE_STRATEGY`, `SubtitleCreatedPayload.revision`, `subtitleId` 기반 partial/final 갱신 규칙
- 팀원 검토·수정 내용: P0에서는 별도 `segmentId`를 추가하지 않고 같은 `subtitleId`와 증가하는 `revision`으로 자막을 교체하도록 정리
- 검증 결과: `pnpm.cmd typecheck` 통과
- 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/6

### 2026-08-15 - LiveKit token API P0 정책 보강

- 담당자: 사용자 검토 예정
- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: Meeting Lab에서 사용할 LiveKit token 발급 API의 room, participant, grant, 환경변수 검증 정책 정리
- 입력 맥락: Issue #6, `docs/FEATURES/realtime-meeting/PIPELINE.md`, LiveKit Cloud 개발 프로젝트 환경변수, `apps/server/src/modules/meeting`
- AI 제안 또는 산출물: `lab-<team>-<yyyymmdd>-<slug>` room 정책, `guest-<uuid>` participant fallback, camera/microphone publish grant 제한, `LIVEKIT_URL` wss 검증, shared build 선행 dev script
- 팀원 검토·수정 내용: 인증 모듈이 붙기 전의 P0 정책으로 제한하고, 인증 이후 identity 정책은 후속 결정으로 남김
- 검증 결과: `pnpm.cmd typecheck` 통과, 정상 room token 발급 확인, invalid room 400 응답 확인, guest identity 생성 확인, token grant의 `camera,microphone` 제한 확인
- 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/6

### 2026-08-16 - LiveKit token API 서버 테스트 추가

- 담당자: 사용자 검토 예정
- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: 프론트엔드 구현 전에 Server token API의 P0 room, participant, grant, 환경변수 정책을 자동 테스트로 고정
- 입력 맥락: Issue #6, `apps/server/src/modules/meeting/meeting.service.ts`, `apps/server/src/integrations/livekit/livekit-token.service.ts`, `apps/server/src/config/environment.ts`
- AI 제안 또는 산출물: `node:test` 기반 server test script, MeetingService 정책 테스트, LiveKit JWT grant 테스트, 환경변수 검증 테스트
- 팀원 검토·수정 내용: 새 테스트 프레임워크를 설치하지 않고 기존 `ts-node`와 Node 내장 test runner로 검증하도록 구성
- 검증 결과: `pnpm.cmd test:server` 10개 테스트 통과, `pnpm.cmd typecheck` 통과
- 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/6

### 2026-08-16 - LiveKit webhook server endpoint

- 담당자: 사용자 검토 예정
- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: LiveKit Cloud room, participant, track events를 Server에서 signature 검증 후 받을 수 있는 P0 endpoint 추가
- 입력 맥락: Issue #6, `docs/FEATURES/realtime-meeting/PIPELINE.md`, `apps/server/src/modules/meeting`, `apps/server/src/integrations/livekit`
- AI 제안 또는 산출물: `POST /meeting/livekit/webhook`, raw body parser 설정, `LiveKitWebhookService`, webhook summary ACK, 서명/본문 hash 검증 테스트
- 사용자 검토/수정 내용: P0에서는 저장, transcript 연결, AI Agent handoff 없이 검증된 event ACK까지만 처리하도록 범위 제한
- 검증 결과: `pnpm.cmd test:server` 16개 테스트 통과, `pnpm.cmd typecheck` 통과
- 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/6

### 2026-08-16 - LiveKit webhook smoke script

- 담당자: 사용자 검토 예정
- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: public LiveKit Cloud webhook 연결 전에 로컬 서버가 LiveKit 서명 방식의 webhook을 수신하고 duplicate ACK까지 처리하는지 재현 가능하게 검증
- 입력 맥락: Issue #6, `docs/FEATURES/realtime-meeting/PIPELINE.md`, `apps/server/src/modules/meeting/meeting.controller.ts`, `apps/server/src/modules/meeting/meeting.service.ts`
- AI 제안 또는 산출물: `pnpm smoke:livekit-webhook`, dry-run 모드, first/duplicate webhook response 검증, 런북 절차
- 사용자 검토/수정 내용: Pipeline의 P0 검증 범위에 맞춰 실제 STT, Translation Agent, Meeting AI Agent, DB 저장은 추가하지 않음
- 검증 결과: `pnpm.cmd smoke:livekit-webhook -- --dry-run` 통과, `pnpm.cmd dev:server` 실행 후 `pnpm.cmd smoke:livekit-webhook` 통과
- 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/6

### 2026-08-16 - LiveKit webhook idempotency

- 담당자: 사용자 검토 예정
- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: LiveKit Cloud webhook 재전송으로 같은 event가 반복 도착해도 room state가 중복 갱신되지 않도록 방어
- 입력 맥락: Issue #6, `docs/FEATURES/realtime-meeting/PIPELINE.md`, `apps/server/src/modules/meeting/meeting.service.ts`
- AI 제안 또는 산출물: LiveKit `event.id` 기반 in-memory idempotency cache, duplicate ACK 응답, event id 없는 webhook은 기존처럼 처리하는 테스트
- 사용자 검토/수정 내용: Pipeline의 P0 서버 범위인 in-memory room state 안정화 안에서만 처리하고, DB persistence와 AI Agent handoff는 추가하지 않음
- 검증 결과: `pnpm.cmd test:server` 22개 테스트 통과
- 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/6

### 2026-08-16 - LiveKit webhook room state registry

- 담당자: 사용자 검토 예정
- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: LiveKit webhook event를 이후 자막, 회의 상태, AI handoff가 참조할 수 있는 최소 room state로 축약
- 입력 맥락: Issue #6, `docs/FEATURES/realtime-meeting/PIPELINE.md`, `apps/server/src/modules/meeting/meeting.service.ts`
- AI 제안 또는 산출물: 인메모리 room state registry, participant/track count snapshot, room finished cleanup, webhook ACK의 `roomState` 반환
- 사용자 검토/수정 내용: DB persistence와 transcript/AI 연결은 후속으로 남기고 P0에서는 서버 프로세스 내 상태 추적만 구현
- 검증 결과: `pnpm.cmd test:server` 20개 테스트 통과, `pnpm.cmd typecheck` 통과
- 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/6

### 2026-08-16 - LiveKit room state API

- 담당자: 사용자 검토 예정
- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: LiveKit Cloud webhook 공개 연결 전에 서버가 반영한 인메모리 room state를 HTTP로 확인할 수 있게 검증 경로 추가
- 입력 맥락: Issue #6, `docs/FEATURES/realtime-meeting/PIPELINE.md`, `apps/server/src/modules/meeting`, `packages/shared/src/contracts/http/meeting.ts`
- AI 제안 또는 산출물: `MeetingRoomStateResponse` shared HTTP 계약, `GET /meeting/rooms/:roomName/state`, smoke script의 room state 조회 검증
- 사용자 검토/수정 내용: AI Agent, transcript 저장, DB persistence는 붙이지 않고 P0 room state 조회와 smoke 검증만 추가
- 검증 결과: `pnpm.cmd test:server` 26개 테스트 통과, `pnpm.cmd typecheck` 통과, `pnpm.cmd smoke:livekit-webhook -- --dry-run` 통과, `pnpm.cmd dev:server` 실행 중 `pnpm.cmd smoke:livekit-webhook` 통과
- 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/6

### 2026-08-16 - LiveKit public webhook smoke safety

- 담당자: 사용자 검토 예정
- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: LiveKit Cloud webhook target 등록 전에 공개 URL smoke 검증 실수를 줄이고, localhost 외부 HTTP target을 차단
- 입력 맥락: Issue #6, `docs/FEATURES/realtime-meeting/PIPELINE.md`, `apps/server/scripts/livekit-webhook-smoke.ts`, `docs/RUNBOOKS/server-local.md`
- AI 제안 또는 산출물: `LIVEKIT_WEBHOOK_SMOKE_URL` 검증, `.env.example` optional smoke override, tunnel/배포 URL smoke 런북, non-local HTTP 거부 테스트
- 사용자 검토/수정 내용: 실제 Cloud console 등록은 공개 HTTPS URL이 필요하므로 후속 수동 단계로 남기고, 사전 검증 경로만 보강
- 검증 결과: `pnpm.cmd test:server` 28개 테스트 통과, `pnpm.cmd typecheck` 통과, `pnpm.cmd smoke:livekit-webhook -- --dry-run` 통과
- 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/6

### 2026-08-16 - Mock subtitle source API

- 담당자: 사용자 검토 예정
- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: 실제 STT/Translation Agent 연결 전에 서버가 `subtitle.created` payload를 shared 계약대로 생성하고 검증할 수 있게 준비
- 입력 맥락: Issue #6, `docs/FEATURES/realtime-meeting/PIPELINE.md`, `packages/shared/src/contracts/socket/subtitle.ts`, `apps/server/src/modules/meeting`
- AI 제안 또는 산출물: `CreateMockSubtitleRequest`, `CreateMockSubtitleResponse`, `POST /meeting/subtitles/mock`, mock subtitle DTO/Service/Controller 테스트
- 사용자 검토/수정 내용: Socket gateway emission은 새 의존성과 Client 연결 단계가 필요하므로 후속 작업으로 남기고, P0에서는 HTTP mock source만 구현
- 검증 결과: `pnpm.cmd test:server` 32개 테스트 통과, `pnpm.cmd typecheck` 통과, `pnpm.cmd dev:server` 실행 중 `POST /meeting/subtitles/mock` 수동 호출 통과
- 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/6

### 2026-08-16 - Mock subtitle buffer API

- 담당자: 사용자 검토 예정
- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: Socket gateway 연결 전에 서버가 room별 최신 mock subtitle payload 목록을 제공해 자막 UI 검증 루프를 준비
- 입력 맥락: Issue #6, `docs/FEATURES/realtime-meeting/PIPELINE.md`, `packages/shared/src/contracts/http/meeting.ts`, `apps/server/src/modules/meeting`
- AI 제안 또는 산출물: `ListMockSubtitlesResponse`, `GET /meeting/rooms/:roomName/subtitles`, room별 인메모리 subtitle buffer, `subtitleId`별 최고 `revision` 유지 테스트
- 사용자 검토/수정 내용: DB 저장과 Socket emission은 후속 작업으로 남기고, P0에서는 프로세스 내 mock buffer와 조회 API만 구현
- 검증 결과: `pnpm.cmd test:server` 36개 테스트 통과, `pnpm.cmd typecheck` 통과, `pnpm.cmd dev:server` 실행 중 `POST /meeting/subtitles/mock` 후 `GET /meeting/rooms/:roomName/subtitles` 수동 호출 통과
- 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/6

### 2026-08-16 - LiveKit Cloud room lifecycle smoke

- 담당자: 사용자 검토 예정
- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: LiveKit Cloud console webhook 등록 이후 실제 Cloud room lifecycle event가 Server webhook과 room state API까지 도달하는지 자동 검증
- 입력 맥락: Issue #6, `docs/FEATURES/realtime-meeting/PIPELINE.md`, LiveKit Cloud 개발 프로젝트, Cloudflare tunnel webhook target
- AI 제안 또는 산출물: `pnpm smoke:livekit-room`, `apps/server/scripts/livekit-room-smoke.ts`, dry-run/URL safety test, runbook 절차
- 사용자 검토/수정 내용: 실제 STT, Translation Agent, Meeting AI Agent, Client media flow는 후속 작업으로 유지하고 Cloud room create/delete event 검증만 추가
- 검증 결과: `pnpm.cmd test:server` 40개 테스트 통과, `pnpm.cmd typecheck` 통과, `pnpm.cmd smoke:livekit-room -- --dry-run` 통과, `pnpm.cmd smoke:livekit-room` 실행 시 `room_started` active 및 `room_finished` finished 확인
- 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/6

### 2026-08-16 - Mock subtitle Socket gateway emission

- 담당자: 사용자 검토 예정
- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: 실제 STT/Translation Agent 연결 전에도 `subtitle.created` shared 계약이 Socket 경로로 room 구독자에게 전달되는지 검증
- 입력 맥락: Issue #6, `docs/FEATURES/realtime-meeting/PIPELINE.md`, `packages/shared/src/contracts/socket/subtitle.ts`, `apps/server/src/modules/meeting`
- AI 제안 또는 산출물: `/meeting` Socket namespace, `meeting.room.subscribe` / `meeting.room.unsubscribe` shared 계약, `MeetingRealtimeGateway`, mock subtitle 생성 시 room-scoped `subtitle.created` emit
- 사용자 검토/수정 내용: STT, Translation Agent, Meeting AI Agent는 후속 작업으로 유지하고 P0 mock source에서 Socket emission만 연결
- 검증 결과: `pnpm.cmd test:server` 44개 테스트 통과, `pnpm.cmd typecheck` 통과
- 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/6

### 2026-08-16 - Meeting finish mock subtitle cleanup

- 담당자: 사용자 검토 예정
- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: LiveKit `room_finished` webhook 이후 P0 인메모리 mock subtitle buffer가 남아 다음 검증에 섞이지 않도록 정리
- 입력 맥락: Issue #6, `docs/FEATURES/realtime-meeting/PIPELINE.md`, `apps/server/src/modules/meeting/meeting.service.ts`
- AI 제안 또는 산출물: `room_finished` 처리 시 room별 mock subtitle buffer 삭제, 종료 후 subtitle 조회가 빈 목록을 반환하는 테스트
- 사용자 검토/수정 내용: 영구 저장과 transcript 보존은 후속 작업으로 남기고, P0 mock buffer cleanup만 구현
- 검증 결과: `pnpm.cmd test:server` 37개 테스트 통과, `pnpm.cmd typecheck` 통과
- 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/6

### 2026-08-16 - Loginless participant policy

- 담당자: 사용자 검토 예정
- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: 로그인 구현 전 P0 Meeting Lab 입장 입력을 사용자 이름과 한국/베트남 선택만으로 제한하고 token 발급 정책을 확정
- 입력 맥락: 사용자 정책 결정, Issue #6, `docs/FEATURES/realtime-meeting/PIPELINE.md`, `packages/shared/src/contracts/http/meeting.ts`, `apps/server/src/modules/meeting`
- AI 제안 또는 산출물: `participantCountry` shared 계약, `kr -> ko` 및 `vn -> vi` 언어 파생, `kr-guest-<uuid>` / `vn-guest-<uuid>` LiveKit identity 파생, token attributes 정리
- 사용자 검토/수정 내용: 로그인 사용자 ID와 직접 입력 `participantIdentity`는 P0 범위에서 제외하고, 인증 도입 시 migration 정책을 후속 결정으로 남김
- 검증 결과: `pnpm.cmd test:server` 44개 테스트 통과, `pnpm.cmd typecheck` 통과, `pnpm.cmd build:server` 통과, `git diff --check` 통과, 수동 token API smoke에서 `kr -> ko` 및 `vn -> vi` 응답 확인
- 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/6
