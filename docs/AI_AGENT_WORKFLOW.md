# AI Agent Workflow

> 작성자: Project Team
>
> 마지막 업데이트: 2026-08-18

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

### 2026-08-17 - 오피스 위치와 공개 TODO 실시간 동기화

- 담당자: 사용자 검토 예정
- 사용한 Agent / Skill: Codex / Systematic Debugging, Test-driven Development
- 사용 목적: 아바타가 정지 후 최초 위치로 복귀하는 현상과 다른 브라우저의 공개 TODO 지연 갱신을 분리해 해결
- 입력 맥락: 두 브라우저 실시간 테스트, `use-office-socket.ts`, `PresenceService`, TODO REST API
- AI 제안 또는 산출물: local avatar store 갱신, avatar 없는 heartbeat, workspace 단위 `office.todos.updated` Socket 계약과 Server broadcast
- 팀원 검토·수정 내용: 실제 브라우저 RS-01~RS-05 검증 후 최종 반영 여부를 결정한다.
- 검증 결과: gateway/controller 단위 테스트와 shared/client/server typecheck 통과. Nest 모듈 초기화 통과, 포트 4000은 기존 실행 프로세스가 사용 중이었다.
- 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/96

### 2026-08-17 - TODO 입력 중 오피스 이동 차단

- 담당자: 사용자 검토 예정
- 사용한 Agent / Skill: Codex / Systematic Debugging, Test-driven Development
- 사용 목적: TODO 제목 입력 중 Phaser의 WASD·방향키 이동이 텍스트 입력과 충돌하는 문제 해결
- 입력 맥락: `OfficeScene.updateLocalMovement()`, TODO 입력 패널, Phaser Keyboard capture 정책
- AI 제안 또는 산출물: 입력 요소 포커스 판별 helper, 포커스 중 velocity 0 처리, Phaser 전역 key capture 해제
- 팀원 검토·수정 내용: 실제 브라우저에서 TODO 제목에 `wasd`와 방향키를 입력해 재현·회귀 확인한다.
- 검증 결과: keyboard focus helper 단위 테스트 통과, client typecheck/build 대기
- 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/97

### 2026-08-17 - 팀원 찾아가기와 호출 요청

- 담당자: 사용자 검토 예정
- 사용한 Agent / Skill: Codex / Brainstorming, Writing Plans, Executing Plans, Test-driven Development
- 사용 목적: 피플 목록에서 실제 아바타 위치 이동과 상대 동의 기반 호출 흐름 추가
- 입력 맥락: ZEP 피플 목록 UX, `PresenceGateway`의 workspace Socket room과 최신 avatar connection 상태
- AI 제안 또는 산출물: 호출 Socket 계약, 30초 in-memory 요청 수명주기, 수락 모달, 기존 `presence.move`를 통한 최종 위치 전파
- 팀원 검토·수정 내용: 호출은 대상이 수락했을 때만 이동하도록 확정했다.
- 검증 결과: gateway 수락 위치 테스트, shared/client/server typecheck, production build 확인 예정
- 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/98

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
### 2026-08-15 - 통역 파이프라인 참가자-언어 매핑과 관용구 사전

- 담당자: seongmin
- 사용한 Agent / Skill: Claude Code / `.agents/skills/commit-convention`
- 사용 목적: Issue #3의 1·3단계 구현, 커밋 분리, 배치 결정 기록
- 입력 맥락: Issue #3 요구사항(지원 언어 2개 고정·참가자 수 무제한), `docs/CONVENTIONS.md`, `docs/STRUCTURE.md`, `docs/FEATURES/realtime-meeting/README.md`
- AI 제안 또는 산출물:
  - `apps/translation-pipeline` 구조와 1·3단계 코드, 테스트 72개
  - `data/glossary.json`의 한국어·베트남어 관용구 초안
  - 커밋 분리 계획(1단계 4건, 3단계 5건)과 ADR 0001 초안
- 팀원 검토·수정 내용:
  - Python 앱을 `apps/` 아래 두는 배치를 사용자가 결정
  - 브랜치 규칙을 `main` 기반에서 `dev` 기반으로 변경하도록 사용자가 결정
  - 유료 API 사용 불가 상황을 사용자가 알려, 번역 provider를 인터페이스로 추상화하고 Gemini를 먼저 쓰도록 결정
  - 커밋 계획 9건을 사용자가 검토·승인한 뒤 반영
- 검증 결과:
  - `python -m pytest` 72 passed
  - 관용구 매칭 6개 시나리오 직접 실행(완전 일치·구두점 포함·부분 일치·미매칭·양방향·`use_llm_for_glossary_match=True`·중복 매칭 우선순위)
  - `git check-ignore`로 `.env` 차단 확인, staged diff 시크릿 스캔 통과
  - `.githooks/commit-msg`를 잘못된 메시지와 정상 메시지로 각각 실행해 동작 확인
- 관련 Issue / PR / Discussion: Issue #3, PR #5

미확정 사항:

- `data/glossary.json`의 베트남어 표현은 AI 초안이며 베트남어 사용자 검토 전까지 확정이 아니다.
- 코드 리뷰는 PR #5에서 진행 예정이다.

### 2026-08-15 - Virtual Office Client와 Presence 통합 기반

- 담당자: Virtual Office 담당자 검토 예정
- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: LiveKit 담당자가 결합 테스트를 시작할 수 있는 Client 진입점과 실시간 오피스 상태 동기화 기반 구성
- 입력 맥락: `docs/PRD.md`, Virtual Office 구현 계획, 기존 LiveKit 토큰 API와 공유 계약
- AI 제안 또는 산출물: React + Vite Client, Phaser 임시 Scene, Socket.IO Presence Gateway, `/office` 및 `/meeting-lab` 경로, 로컬 실행 Runbook
- 팀원 검토·수정 내용: 실제 에셋·영상·음성·번역 자막 범위를 제외하고, 회의 담당자의 소유 경계를 분리
- 검증 결과: 전체 typecheck/build, Server health 및 토큰 API 호출, 두 Socket 클라이언트의 입장·이동·상태 이벤트 수동 통합 검증 통과
- 관련 Issue / PR / Discussion: Issue #9, PR #7

### 2026-08-15 - 번역 provider 계약과 Gemini 구현

- 담당자: seongmin
- 사용한 Agent / Skill: Claude Code / `.agents/skills/commit-convention`
- 사용 목적: Issue #3의 4단계 구현. 번역 provider를 교체 가능하게 만들고 첫 구현을 붙이는 것
- 입력 맥락: Issue #3 요구사항, `docs/CONVENTIONS.md`, `docs/STRUCTURE.md`, 유료 API를 쓸 수 없다는 제약
- AI 제안 또는 산출물:
  - `Translator` 계약, `TranslationRequest`, 시스템 프롬프트 동적 생성, 테스트용 `FakeTranslator`
  - 최근 5턴을 유지하는 `ConversationContext`
  - `GeminiTranslator`와 테스트 51건
  - 후보 모델 4종의 성공률·지연 측정
- 팀원 검토·수정 내용:
  - 유료 API 사용 불가 상황을 사용자가 알려, provider를 인터페이스로 추상화하고 Gemini를 먼저 쓰기로 결정
  - AI가 넣은 재시도 로직을 사용자가 지적해 제거했다. 재시도가 성공해도 그 시점에는 늦은 번역이라 이후 발화와 순서가 엉킨다는 판단
  - 같은 이유로 timeout을 15초에서 줄이도록 요구했으나, Gemini가 10초 미만 deadline을 거부해 하한값으로 확정
  - 라이브 검증에서 나온 사전 준수 문제와 지연 문제를 별도 Issue로 분리하도록 결정
- 검증 결과:
  - `python -m pytest` 120 passed
  - 실제 Gemini API로 4개 시나리오 확인(완전 일치·부분 일치·사전 없음·베트남어에서 한국어)
  - 후보 모델 4종을 3회씩 호출해 성공률과 지연 측정
  - 10초 미만 timeout이 API에서 400으로 거절되는 것 확인 후 생성 시점 가드 추가
- 관련 Issue / PR / Discussion: Issue #3, PR #12, 후속 Issue #10·#11

미확정 사항:

- 확정 번역 사전이 항상 그대로 적용되지 않는다. 부분 일치일 때 모델이 표현을 바꾸는 사례가 있고 일관되지 않다 (Issue #10).

### 2026-08-16 - 마이크 실시간 통역 연결

- 담당자: seongmin
- 사용한 Agent / Skill: Claude Code / `.agents/skills/commit-convention`
- 사용 목적: Issue #3의 6단계 구현. 말하면 번역이 뜨는지를 실제로 확인하는 것
- 입력 맥락: Issue #3 요구사항(별도 VAD를 만들지 말고 Deepgram endpointing 사용), 4단계 결과물, 무료 티어 할당량이 소진된 상황
- AI 제안 또는 산출물:
  - Deepgram 실시간 인식 `stt.py`. 마이크 입력을 큐로 넘기고 `speech_final`로 발화 종료를 판단
  - 실행 스크립트 `scripts/live_translate.py`
  - 결과 해석과 입력 검증 테스트 17건
  - 모델별 지연·할당량 재측정
- 팀원 검토·수정 내용:
  - 준수율 측정보다 실제 동작 확인이 먼저라고 판단해 작업 순서를 바꿈. 그 결과 2단계(파일 STT)를 건너뛰고 6단계를 먼저 진행
  - Gemini 무료 티어가 막혔을 때 Gemma 사용을 사용자가 제안했고, 실제로 할당량 여유가 확인됨
  - 기본 모델을 `gemini-3.1-flash-lite`로 바꾸도록 결정. 기존 기본값이 429가 나는 상태로 남으면 팀원이 처음 실행할 때 그대로 막히기 때문
  - **실제 마이크 검증은 사용자가 직접 실행했다.** AI는 마이크에 말할 수 없어 이 부분은 대신할 수 없다
- 검증 결과:
  - `python -m pytest` 137 passed
  - 사용자가 실제 음성으로 확인: `다들 고생하셨습니다. 내일 봬요.` → `Cảm ơn anh/chị đã vất vả. Hẹn gặp lại mọi người vào ngày mai.` (2.1초)
  - 사전 완전 일치 발화는 모델을 거치지 않아 0.0초
  - Deepgram 웹소켓 `language=ko`, `language=vi` 양쪽 연결 확인
  - 마이크 캡처 동작을 3초 녹음으로 확인
  - 모델별 지연 3회씩 측정. `gemini-3.1-flash-lite` 2.0초, `gemini-3-flash-preview` 7.3초, `gemini-3.5-flash` 429, `gemma-4-31b-it` 13~21초
- 관련 Issue / PR / Discussion: Issue #3, PR #13, Issue #11 코멘트

미확정 사항:

- `stt.py`의 스트리밍 루프에는 단위 테스트가 없다. 마이크와 웹소켓이 필요해서이며, 실제 음성으로만 확인했다.
- 늦게 도착한 번역을 버리는 처리가 없다 (Issue #11).
- 무료 티어 할당량이 실제 회의 분량을 감당하지 못할 수 있다 (Issue #11).

### 2026-08-16 - Meeting Lab 프론트 SDK 진입 정책

- 해당자: 사용자 검토 예정
- 사용한 Agent / Skill: Codex / Project Workflow Skill, GitHub Skill
- 사용 목적: Issue #30 범위의 첫 프론트 작업으로, 로그인 없이 이름과 국가를 기억하고 오피스 섹션에서 LiveKit roomName을 파생하도록 Client 진입 흐름 구성
- 입력 맥락: 사용자 결정(이름/국가만 입력, 룸 번호 직접 입력 없음), `docs/FEATURES/realtime-meeting/PIPELINE.md`, `apps/client/src/pages/meeting-lab/MeetingLabPage.tsx`
- AI 제안 또는 산출물: `DevelopmentProfile` localStorage 저장, `participantCountry` 기반 언어 파생 유지, `meeting-room` 섹션 resolver, Meeting Lab 수동 roomName 입력 제거
- 사용자 검토/수정 내용: 코드 변경 후 사용자 확인 예정
- 검증 결과: `corepack pnpm --filter @likelion2026/client typecheck` 통과, `git diff --check` 통과
- 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/30

### 2026-08-16 - Meeting Lab camera/mic preflight

- 해당자: 사용자 검토 예정
- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: LiveKit 연결 전에 브라우저 camera/mic 권한과 장치 유무를 분리해서 확인하는 Client preflight UI 구성
- 입력 맥락: Issue #34, `docs/FEATURES/realtime-meeting/PIPELINE.md`, `apps/client/src/pages/meeting-lab/MeetingLabPage.tsx`
- AI 제안 또는 산출물: `getUserMedia` 기반 권한 확인, 장치 수 확인, `idle/checking/ready/permission-denied/device-unavailable` 상태 표시, ready 전 토큰 요청 차단
- 사용자 검토/수정 내용: 코드 변경 후 사용자 확인 예정
- 검증 결과: `corepack pnpm --filter @likelion2026/client typecheck` 통과, `git diff --check` 통과
- 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/34

### 2026-08-16 - Meeting Lab LiveKit room connect

- 해당자: 사용자 검토 예정
- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: Token API 응답의 `serverUrl`과 `token`으로 LiveKit Cloud room에 연결하고 local camera/mic track publish 흐름 구성
- 입력 맥락: Issue #35, LiveKit client SDK v2.21.0 README와 로컬 타입 정의, `apps/client/src/pages/meeting-lab/MeetingLabPage.tsx`
- AI 제안 또는 산출물: `Room.connect`, `localParticipant.enableCameraAndMicrophone`, 연결/게시/재연결/실패/종료 상태 hook, `room.disconnect(true)` 기반 cleanup
- 사용자 검토/수정 내용: 실제 브라우저 camera/mic 연결 확인은 사용자 검토 예정
- 검증 결과: `corepack pnpm --filter @likelion2026/client typecheck` 통과, `git diff --check` 통과
- 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/35

### 2026-08-16 - Meeting Lab media render and controls

- 해당자: 사용자 검토 예정
- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: LiveKit 연결 후 local/remote video/audio track을 화면에 렌더링하고 mic/camera 토글을 실제 track 상태와 연결
- 입력 맥락: Issue #36, LiveKit client SDK track attach/detach 타입 정의, `apps/client/src/features/realtime-meeting/model/use-livekit-meeting-session.ts`
- AI 제안 또는 산출물: local/remote media track snapshot, `<video>`/`<audio>` attach 컴포넌트, remote audio sink, mic/camera toggle, participant/track event 기반 UI 갱신
- 사용자 검토/수정 내용: 두 브라우저 간 실제 video/audio 송수신 확인은 사용자 검토 예정
- 검증 결과: `corepack pnpm --filter @likelion2026/client typecheck` 통과, `git diff --check` 통과
- 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/36

### 2026-08-16 - Meeting Lab subtitle Mock display

- 해당자: 사용자 검토 예정
- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: Issue #37 범위에서 Meeting Lab이 `/meeting` Socket namespace를 구독하고 `subtitle.created` Mock payload를 실시간 자막 UI에 표시하도록 구성
- 입력 맥락: Issue #37, `docs/FEATURES/realtime-meeting/PIPELINE.md`, `packages/shared/src/contracts/socket/subtitle.ts`, `apps/client/src/pages/meeting-lab/MeetingLabPage.tsx`
- AI 제안 또는 산출물: mock subtitle buffer 조회 API, roomName 기반 Socket subscribe/unsubscribe hook, `subtitleId`와 `revision` 기반 partial/final 교체 로직, 원문/번역문/화자/시각/확정 여부 표시 패널
- 사용자 검토/수정 내용: 코드 변경 후 사용자 확인 예정
- 검증 결과: `corepack pnpm --filter @likelion2026/client typecheck` 통과, `git diff --check` 통과
- 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/37

### 2026-08-16 - Realtime Meeting P0 verification helper

- 해당자: 사용자 검토 예정
- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: Issue #38 범위에서 Meeting Lab P0 데모와 Mock subtitle 확인을 반복 가능한 절차로 정리
- 입력 맥락: Issue #38, `docs/FEATURES/realtime-meeting/PIPELINE.md`, `docs/RUNBOOKS/client-local.md`, `docs/RUNBOOKS/server-local.md`, 기존 LiveKit smoke script 패턴
- AI 제안 또는 산출물: `pnpm smoke:meeting-subtitle`, partial/final Mock subtitle smoke script, dry-run 테스트, 두 브라우저 Meeting Lab 데모 절차
- 사용자 검토/수정 내용: 실제 두 브라우저 카메라/마이크와 화면 표시 확인은 사용자 검토 예정
- 검증 결과: `corepack pnpm --filter @likelion2026/server typecheck` 통과, `corepack pnpm --filter @likelion2026/server smoke:meeting-subtitle -- --dry-run` 통과, `corepack pnpm --filter @likelion2026/server test` 47개 테스트 통과
- 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/38
### 2026-08-16 - 오피스 영속 Presence 동기화

- 담당자: Virtual Office 담당자 검토 예정
- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: 원격 팀원이 실제 근무 화면을 공유하지 않아도 접속·퇴근·마지막 위치를 확인할 수 있도록, 게스트 세션과 Socket.IO Presence를 연결
- 입력 맥락: Issue #29, PR #26의 게스트 세션·Supabase ERD, 기존 Phaser 오피스 Gateway, `docs/FEATURES/virtual-office/contracts.md`
- AI 제안 또는 산출물:
  - `member_presence`를 기준으로 한 workspace snapshot, heartbeat, disconnect, 위치 flush 흐름
  - guest token을 room broadcast에서 제외하는 Socket 계약
  - 이동은 Socket으로 즉시 중계하고 1초마다 마지막 좌표만 DB에 저장하는 경계
  - Phaser ghost/sleeping 표현과 PresenceService 단위 테스트 초안
- 팀원 검토·수정 내용: 실제 화면 감시가 아닌 사용자가 선택한 상태와 서비스 연결 상태만 공유하며, 휴가·재택 자동 판정과 TODO UI는 후속 Issue로 분리
- 검증 결과: `corepack pnpm typecheck`, `corepack pnpm build` 통과. 실제 Supabase와 두 브라우저 연결 검증은 Server 환경 변수를 설정한 뒤 수행 필요
- 관련 Issue / PR / Discussion: Issue #29, PR 작성 예정

### 2026-08-16 - 게스트 첫 입장 흐름

- 담당자: Virtual Office 담당자 검토 예정
- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: URL query 없이 이름과 한국·베트남 선택만으로 게스트 세션을 만들고 오피스에 입장시키는 흐름 구성
- 입력 맥락: Issue #40, `POST /office/session` 계약, 게스트 세션과 Presence 동기화 구현
- AI 제안 또는 산출물: 프로필·guest token의 localStorage 책임 분리, 세션 성공 뒤 Socket 연결, 모달의 입력·로딩·오류 상태, Meeting Lab 호환 기본 프로필
- 팀원 검토·수정 내용: 실제 화면 감시나 SNS 정보는 저장하지 않고, 이름·국가·언어와 Server 소유권 확인용 guest token만 유지. 아바타 직접 선택은 해커톤 후속 범위로 분리
- 검증 결과: Client typecheck와 production build 통과. 로컬 `/office` 응답 확인. 실제 세션 성공 흐름은 Supabase Server 환경 변수 설정 후 검증 필요
- 관련 Issue / PR / Discussion: Issue #40, PR 작성 예정

### 2026-08-16 - 공개 TODO API 계약

- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: 원격 협업에서 화면 감시 없이 오늘의 업무 맥락을 공유하는 TODO 소유권·공개 범위 설계
- 입력 맥락: Issue #48, Supabase `todos` 테이블, 게스트 세션 소유권 계약
- AI 제안 또는 산출물: 공개·비공개 조회 분리, guest token 소유권 확인, TODO 상태 DTO와 API 경로
- 팀원 검토·수정 내용: `blocked`를 개인 평가가 아닌 지원 요청 신호로 정의. Socket 요약 전파와 UI는 후속 구현으로 분리
- 검증 결과: Shared·Server typecheck 통과
- 관련 Issue / PR / Discussion: Issue #48, PR 작성 예정

### 2026-08-16 - TODO UI 디자인 교체 경계

- 사용한 Agent / Skill: Codex / Figma Design-to-Code Skill, Project Workflow Skill
- 사용 목적: 와이어프레임 단계의 Figma를 확인해 상세 스타일 확정 전에도 TODO 데이터 계층과 디자인 컴포넌트를 분리
- 입력 맥락: Figma `XNMBF9IXkhkotGr6EoiW4J`, Issue #52, 공개 TODO HTTP 계약
- AI 제안 또는 산출물: TODO API client, 세션 기반 controller hook, render function 기반 `OfficeTodoPanelSlot`, 디자인 적용 연결 문서
- 팀원 검토·수정 내용: 임의의 시각 디자인과 에셋을 추가하지 않고, 추후 Figma 컴포넌트로 교체할 수 있는 데이터 계약만 반영
- 검증 결과: Client typecheck와 production build 통과. Vite의 Phaser 초기 번들 크기 경고는 기존 과제로 유지
- 관련 Issue / PR / Discussion: Issue #52, PR 작성 예정

### 2026-08-16 - Virtual Office 전체 사용자 시나리오

- 사용한 Agent / Skill: Codex / Figma Design-to-Code Skill, Project Workflow Skill
- 사용 목적: 와이어프레임과 현재 구현 범위를 바탕으로 입장부터 상태·TODO·People·일정·회의·번역까지 연결한 서비스 전체 흐름 정리
- 입력 맥락: Figma `XNMBF9IXkhkotGr6EoiW4J`, Virtual Office 기능 문서, 구현·후속 범위
- AI 제안 또는 산출물: 한국·베트남 협업 팀의 6개 사용자 시나리오, 해커톤 데모 4분 흐름, 신뢰·개인정보 경계, 디자인 검토 화면 목록
- 팀원 검토·수정 내용: 실제 구현 범위와 목표 기능을 분리하고, 화면 감시가 아닌 사용자가 선택한 공개 정보만 공유한다는 원칙을 반영
- 검증 결과: Client typecheck와 production build 통과. 문서 간 상대 경로와 `git diff --check` 확인
- 관련 Issue / PR / Discussion: Issue #52, PR 작성 예정

### 2026-08-16 - 공유 캘린더 P0 계약

- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: 기존 Supabase 일정 테이블을 활용해 일정 소유권, 팀 공개 조회, 현재 시각 기준 파생 상태를 설계
- 입력 맥락: Issue #58, `calendar_events`, `calendar_event_participants`, Presence 상태 학습 기록
- AI 제안 또는 산출물: 일정 CRUD HTTP 계약, 생성자 guest token 소유권 검증, 휴가·부재·회의·집중·재택 우선순위, 디자인 교체형 controller·slot
- 팀원 검토·수정 내용: 캘린더는 DB Presence를 영구 변경하지 않고 Client가 현재 유효한 상태만 표현에 반영하도록 결정
- 검증 결과: Shared·Server·Client typecheck, Server·Client production build 통과. Phaser 초기 번들 크기 경고는 기존 과제로 유지
- 관련 Issue / PR / Discussion: Issue #58, PR 작성 예정

### 2026-08-16 - 원격 아바타 시간 기반 위치 보간

- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: 원격 협업 오피스에서 상대 아바타가 저주기 Socket 좌표 갱신 사이에 계단형으로 움직이는 문제를 줄임
- 입력 맥락: 두 브라우저 테스트 영상, `presence.move` 80ms 전송 제한, Phaser 고정 비율 Lerp 렌더링
- AI 제안 또는 산출물: 최근 좌표 샘플을 수신 시각과 함께 보관하고 120ms 표시 지연 안에서 시간 기반으로 보간하는 Scene 로직, 60ms 이동 전송 간격
- 팀원 검토·수정 내용: Server Socket payload와 1초 Supabase 위치 영속화는 변경하지 않는다. 실제 두 브라우저의 체감 품질은 배포 환경에서 사람이 확인한다.
- 검증 결과: Client typecheck·build 및 두 브라우저 수동 검증 예정
- 관련 Issue / PR / Discussion: Issue #63

### 2026-08-16 - Production 배포 테스트 시나리오

- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: `main`에 병합되는 기능이 Vercel, Render, Supabase, LiveKit Cloud에서 실제로 연결되는지 팀이 같은 기준으로 검증하도록 릴리스 테스트 범위 문서화
- 입력 맥락: Deployment Runbook, Client·Server Local Runbook, Meeting Lab·자막·게스트 오피스·TODO·공유 캘린더의 현재 구현 경계
- AI 제안 또는 산출물: 환경별 설정 점검, 배포 직후 스모크, 두 브라우저 E2E, 실패 시나리오, 실제 결과 기록 표가 있는 Production Test Scenarios
- 팀원 검토·수정 내용: Production URL과 실제 배포 결과는 사람이 실행 후 기록한다. 환경변수 값, token, Secret, 개인 정보는 문서에 남기지 않는다.
- 검증 결과: 문서 상대 링크와 `git diff --check` 확인 예정. 실제 Production 실행은 이 문서의 체크리스트에 따라 별도 수행 필요.
- 관련 Issue / PR / Discussion: Issue #61

### 2026-08-16 - Vercel SPA deep-link fallback

- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: Vercel Production에서 `/office` 직접 접속 또는 새로고침 시 404가 나는 문제의 원인을 확인하고 SPA 경로 fallback 추가
- 입력 맥락: `apps/client/src/app/App.tsx`의 `BrowserRouter`, Vercel 404 기록, 저장소 루트의 배포 설정 부재
- AI 제안 또는 산출물: 모든 비정적 요청을 `/index.html`로 전달하는 루트 `vercel.json` rewrite와 deep-link 새로고침 스모크 항목
- 팀원 검토·수정 내용: Vercel Production 재배포 뒤 `/office`, `/meeting-lab` 직접 접속·새로고침은 사람이 실제로 확인해야 한다.
- 검증 결과: JSON 형식 검사와 Client production build 확인 예정. Vercel Production 확인은 재배포 후 수행 필요.
- 관련 Issue / PR / Discussion: Issue #61

### 2026-08-17 - 레드판다 아바타 스프라이트시트 적용

- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: Virtual Office의 임시 도형 아바타를 디자인팀이 제공한 규격화 레드판다 시트로 교체
- 입력 맥락: `apps/client/public/assets/image.png`, Phaser Scene의 local·remote avatar rendering, Issue #70
- AI 제안 또는 산출물: `256 x 256px` 고정 frame을 셀 외곽 `2px` 제외 영역으로 등록하는 texture frame, `idle/walk × 방향` Phaser animation, 좌측 이동 반전, local physics body와 remote label·상태 표현 유지
- 팀원 검토·수정 내용: Moyo의 direction·state 기반 animation manager를 참고했다. 새 파일은 6열 x 4행 격자이므로 임의 crop 좌표 대신 방향별 frame index를 명시한다. export된 셀 경계의 비투명 픽셀은 `2px` trim으로 방어한다. 측면 idle과 walk의 원본 시선 방향이 반대여서 상태별 `flipX` 규칙을 분리했으며, frame index와 표시 크기는 브라우저에서 사람이 확인한다.
- 검증 결과: Client typecheck·build 및 브라우저 수동 확인 예정
- 관련 Issue / PR / Discussion: Issue #70

### 2026-08-17 - Virtual Office mock 맵 배경 적용

- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: 빈 격자 Scene을 실제 오피스 공간처럼 검증할 수 있는 타일 기반 배경으로 교체
- 입력 맥락: 공개 Moyo 저장소의 `lobby.webp`, Phaser Virtual Office Scene, Issue #78
- AI 제안 또는 산출물: `1.5x` map scale의 `1440 x 816` world, world 중앙 map alignment, 전체 화면 Canvas, responsive camera zoom과 avatar follow, local avatar를 기준으로 한 `0.75`~`3.2` wheel/trackpad zoom, 하단 우측 회의 구역 overlay, temporary map asset 출처·권리 확인·collision 제한사항 문서화
- 팀원 검토·수정 내용: 배경은 내부 개발·해커톤 mock으로만 사용한다. 가구 충돌과 최종 에셋 권리는 별도 검토 대상이며, 최종 배포 전 팀 제작 맵 또는 사용이 허가된 에셋으로 교체한다.
- 검증 결과: Client typecheck·build 및 `/office` 브라우저 수동 확인 예정
- 관련 Issue / PR / Discussion: Issue #78

### 2026-08-17 - 아바타 정지·보행 전환 기준점 정규화

- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: 레드판다 아바타가 정지에서 보행으로 전환될 때 물리 좌표와 무관하게 그림이 미세하게 튀어 보이는 현상 제거
- 입력 맥락: `image.png` 6 x 4 스프라이트시트, `office-scene.ts`의 공통 origin·physics body, 정지·보행 전환 녹화
- AI 제안 또는 산출물: 각 frame의 alpha 경계를 런타임에서 계산해 가로 중심과 발끝 baseline을 정규화한 CanvasTexture, 표시 texture만 변경하고 Socket·physics 좌표를 보존하는 구조
- 팀원 검토·수정 내용: 셀 내부 alpha 경계를 비교해 down idle 하단 `y=236`과 보행 frame 하단 `y=209~228`의 차이를 확인했다. 고정 offset을 방향별로 추가하지 않고 새 에셋에서도 동작하는 alpha 기반 보정으로 채택했다. 최종 체감 자연스러움은 실제 브라우저에서 방향별 `정지 → 이동 → 정지`으로 확인한다.
- 검증 결과: Client typecheck·build와 `git diff --check` 통과. 실제 Canvas 렌더링은 팀원이 브라우저에서 추가 확인 필요.
- 관련 Issue / PR / Discussion: Issue #70, PR #71

### 2026-08-17 - Vercel Client Root Directory SPA fallback 수정

- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: `main`에 루트 `vercel.json`이 병합된 뒤에도 Production `/office` 새로고침이 Vercel 404를 반환한 원인을 수정
- 입력 맥락: Production URL의 `/` 200 응답과 `/office` 404 응답, Vercel Client 프로젝트의 `apps/client` Root Directory, Issue #67
- AI 제안 또는 산출물: Root Directory 안의 `apps/client/vercel.json`에 SPA rewrite를 두고 Deployment Runbook과 smoke test의 실제 설정 기준을 정정
- 팀원 검토·수정 내용: 설정 파일 문법 자체가 아니라 Vercel이 Root Directory 바깥의 루트 설정 파일을 읽지 않는 배포 경계 문제로 확인했다. 최종 Production 재배포와 새로고침 결과는 사람의 브라우저로 기록한다.
- 검증 결과: Client build와 JSON 형식 확인 예정. main 병합 뒤 Production `/office`, `/meeting-lab` 직접 접속·새로고침은 Issue #67에 실제 결과를 남긴다.
- 관련 Issue / PR / Discussion: Issue #67

### 2026-08-17 - 원격 아바타 이동 끊김 원인 조사와 해결 계획

- 사용한 Agent / Skill: Codex / Systematic Debugging Skill
- 사용 목적: 두 브라우저에서 원격 아바타가 끊기거나 과거 위치로 되돌아 보이는 현상의 원인을 수정 전에 추적
- 입력 맥락: 일반 창·시크릿 창 동시 테스트 영상, Client 60ms 이동 전송, Server의 1초 Supabase 위치 영속화, Phaser 120ms 원격 보간
- AI 제안 또는 산출물: DB 저장 응답이 과거 좌표를 늦게 중계할 수 있는 비동기 경계 분석, sequence 기반 과거 패킷 폐기와 중계·영속화 분리 계획, 자동·수동 검증 시나리오
- 팀원 검토·수정 내용: 아바타 에셋이나 보간 계수를 먼저 조정하지 않고, Socket과 DB 사이의 패킷 순서 문제를 우선 해결 대상으로 정의했다. 실제 DB 지연 시간과 수정 뒤 체감 결과는 후속 구현 PR에서 사람이 두 브라우저로 확인한다.
- 검증 결과: 코드 경로와 영상 재현 조건을 문서화했다. 기능 수정과 지연 저장 재현 테스트는 Issue #87의 후속 구현 범위다.
- 관련 Issue / PR / Discussion: Issue #87
### 2026-08-16 - 관용구를 고정 사전에서 프롬프트 지침으로 이관

- 사용한 Agent / Skill: Claude Code / Commit Convention Skill
- 사용 목적: 한국어·베트남어 관용구가 고정 사전으로 처리되지 않는 원인 조사와 대안 구현
- 입력 맥락: `data/glossary.json`의 부분 문자열 매칭 구현, 실제 발화 표본, 사전 준수율 측정 스크립트
- AI 제안 또는 산출물: 관용구를 `data/idiom_guidelines/{source}_{target}.md` 지침으로 옮기고 번역 방향에 맞는 파일만 시스템 프롬프트에 싣는 구조, 유보 표현 등 지침 항목 초안
- 팀원 검토·수정 내용: 처음 제안한 "문맥상 완곡한 거절이면 거절로 번역한다"는 규칙은 사용자가 위험하다고 지적해 "모호함을 유지하고 확정적으로 들리게 하지 않는다"로 바꿨다. 금지 규칙만 두면 모델이 직역으로 돌아가는 것을 확인해 대체 표현을 함께 제시하는 형태로 수정했다. 베트남어 표현의 자연스러움은 베트남어 사용자의 검토가 필요하며 Issue #18로 남겼다.
- 검증 결과: `pytest` 실행. 유보 표현 8건에 대해 금지 표현이 나오지 않는 것을 사람이 확인.
- 관련 Issue / PR / Discussion: Issue #10, PR #19

### 2026-08-16 - 통역 결과를 자막 계약으로 발행

- 사용한 Agent / Skill: Claude Code / Commit Convention Skill
- 사용 목적: 콘솔에만 출력되던 번역 결과를 회의 화면 자막까지 전달
- 입력 맥락: `packages/shared`의 `SubtitleCreatedPayload` 계약, Server의 `POST /meeting/subtitles/mock`, 원래 스펙의 snake_case 출력 형식
- AI 제안 또는 산출물: 계약을 그대로 따르는 자막 페이로드 생성기, 방 이름·참가자 ID 사전 검증, 참가자 매핑을 실제로 사용하는 실행 스크립트
- 팀원 검토·수정 내용: 원래 스펙의 snake_case 형식 대신 `packages/shared` 계약을 따르기로 정했다. 변환 계층이 하나 더 생기는 것을 피하기 위해서다. `used_glossary`는 자막 표시용 값이 아니라 내부 지표이므로 페이로드에서 제외했다. 발행 대상 서버 포트가 3000으로 잘못돼 있어 4000으로 고쳤다.
- 검증 결과: `pytest` 실행. 로컬 Server를 띄우고 실제 발행 후 브라우저에서 자막이 표시되는 것을 사람이 확인.
- 관련 Issue / PR / Discussion: PR #31

### 2026-08-17 - 확정된 발화 조각 유실 수정과 조각 단위 자막 갱신

- 사용한 Agent / Skill: Claude Code / Commit Convention Skill
- 사용 목적: 실시간 통역에서 문장 앞부분이 자막에 뜨지 않는 원인 규명과 수정
- 입력 맥락: `stt.py`의 Deepgram 결과 처리 분기, 실제 발화를 녹음해 얻은 이벤트 타이밍 로그, Client의 revision 기반 upsert 구현
- AI 제안 또는 산출물: 이벤트 관측 스크립트, `is_final`만 선 조각이 어느 분기에도 들어가지 않아 버려진다는 원인 분석, 발화 하나를 자막 하나로 유지하며 조각마다 `revision`을 올리는 구조, 늦은 번역 폐기 규칙을 마지막 조각으로 한정하는 변경
- 팀원 검토·수정 내용: 사용자가 관측 스크립트를 직접 실행해 `IS_FINAL`과 `SPEECH_FINAL`이 서로 다른 내용임을 확인했고, 이 데이터로 설계 방향이 정해졌다. 처음 제시한 "N+1회 호출"은 사용자가 계산을 지적해 N회로 정정했다. 폐기 규칙의 근거였던 "늦은 자막이 순서를 엉키게 한다"는 Client가 `occurredAt` 순으로 정렬하는 것을 확인해 성립하지 않는 것으로 정정했다. Issue와 PR 본문이 저장소 템플릿을 따르지 않은 것, 커밋에 AI 공동작성자 트레일러가 들어간 것을 사용자가 지적해 모두 수정했다.
- 검증 결과: `pytest` 213건 통과. 마이크로 실제 발화를 흘려 같은 자막이 `rev 1` → `rev 2`로 갱신되는 것을 사람이 확인. 측정 중 `gemini-3.1-flash-lite`가 5회 중 2회 `504 DEADLINE_EXCEEDED`로 실패했으며, 이는 무료 한도 소진과 다른 서버 측 문제로 PR에 제한사항으로 기록했다.
- 관련 Issue / PR / Discussion: Issue #72, PR #73

### 2026-08-17 - 말하는 도중 중간 결과를 번역해 자막 지연 단축

- 사용한 Agent / Skill: Claude Code / Commit Convention Skill
- 사용 목적: 자막이 말이 끝난 뒤에야 뜨는 체감 지연을 줄임
- 입력 맥락: PR #73에서 만든 `subtitleId` 고정 + `revision` 갱신 구조, Deepgram이 말하는 도중 1초에 한 번씩 보내는 중간 결과, 마이크 실측 로그
- AI 제안 또는 산출물: 확정 전 중간 결과를 번역하는 `handle_interim` 경로와 잠정 꼬리 누적, 번역을 워커 스레드 하나로 분리한 `session.py`, 원문이 같으면 직전 번역을 재사용하는 처리, 첫 자막 시간과 분당 호출 수를 내는 실행 스크립트
- 팀원 검토·수정 내용: 사용자가 "말을 하자마자 바로 자막이 보였으면 좋겠다"는 요구를 제시했고, 첫 자막 1초는 LLM 번역으로 불가능하며 전용 기계번역 엔진이 필요하다는 것을 확인한 뒤 무료로 가능한 범위(중간 결과 번역)를 먼저 하기로 정했다. "이미 하고 있는 방식 아니냐"는 질문에 중간 결과를 번역하지 않고 출력만 하고 있었다는 것이 드러났다. 앞 번역에 이어붙이는 대신 매번 원문 전체를 다시 번역하는 이유는 한국어와 베트남어의 어순 차이로, 실측 결과를 근거로 확인했다. 1차 실측에서 같은 문장을 두 번 번역하는 낭비와 문장이 4조각으로 갈라지는 문제를 사용자가 함께 확인해, 번역 재사용을 추가하고 `--endpointing`을 700으로 올려 재측정했다.
- 검증 결과: `pytest` 236건 통과. 마이크 실측에서 첫 자막까지 평균 1194ms(인식 결과 도착 기준, 최소 1155 / 최대 1234), 모델 호출 분당 7.1회, 번역·폐기·발행 실패 0건. PR #73 시점 실측은 2422~5344ms였다. `429`는 발생하지 않았다. 이 측정값은 입을 뗀 순간이 아니라 인식 결과가 도착한 시점부터 잰 것이라는 한계를 PR에 남겼다.
- 관련 Issue / PR / Discussion: Issue #76, PR #77
## 2026-08-17 - 재접속 Presence 표시 상태 조사와 검증

- **문제:** Socket 연결은 성공했지만 원격 아바타가 `연결 해제` 라벨과 ghost 투명도로 표시됐다.
- **관찰:** Supabase 상태를 비밀 값 없이 집계해 `connected/ghost` 2건과 `disconnected/ghost` 1건을 확인했다.
- **원인:** `disconnectRealtimeMember()`가 ghost를 저장한 뒤, `connectRealtimeMember()`가 connection status만 connected로 복구했다.
- **결정:** 오피스 재진입은 자동 출근으로 정의해 `working/active/connected`를 하나의 상태 전이로 저장한다. 퇴근 버튼의 `checked_out/sleeping`과 실제 연결 해제의 `disconnected/ghost`는 유지한다.
- **검증:** 단위 테스트와 로컬 Nest + 실제 Supabase + Socket.IO 통합 검증으로 snapshot 및 DB 상태가 `working/active/connected`가 되는 것을 확인했다. 검증용 guest는 삭제했다.

### 2026-08-17 - 피플 목록과 공개 TODO 협업 맥락 연결

- 사용한 Agent / Skill: Codex / Brainstorming, Writing Plans, Test-Driven Development
- 사용 목적: 원격 팀원이 동료의 화면이나 활동량을 감시하지 않고도, 자발적으로 공개한 현재 상태와 오늘의 업무를 확인하도록 한다.
- 입력 맥락: Socket `OfficeMemberPresence` snapshot, 공개 TODO API, 기존 HUD와 Phaser 카메라 follow 구조, Issue #94
- AI 제안 또는 산출물: 멤버·공개 TODO를 결합하는 순수 표시 모델, 피플 목록과 읽기 전용 프로필 패널, 아바타 좌표만 보는 `찾아가기` 카메라 포커스 경계, 설계·구현 계획 문서
- 팀원 검토·수정 내용: 목록 클릭은 프로필만 열고, 카메라 이동은 명시적인 `찾아가기` 행동으로 분리했다. 카메라 포커스는 로컬 아바타나 Socket 위치를 바꾸지 않으며, 사용자가 다시 이동할 때만 본인 아바타 follow를 복구한다.
- 검증 결과: 표시 모델 테스트 2건, Client typecheck, Client production build를 통과했다. 로컬 API로 한국·베트남 테스트 멤버 2명과 공개 TODO 1건의 생성·조회까지 확인했다. 브라우저 시각 확인은 별도 수동 확인이 필요하다.
- 관련 Issue / PR / Discussion: Issue #94

### 2026-08-17 - red-panda 기본 아바타와 내 TODO 작성 패널

- 사용한 Agent / Skill: Codex / Test-Driven Development, Project Workflow Skill
- 사용 목적: 비표준 gray-cat 아틀라스의 세션 배정을 중단하고, 사용자가 자발적으로 오늘의 업무를 작성·공개하도록 한다.
- 입력 맥락: `office-avatar.ts` 신규 게스트 선택 함수, 기존 TODO 생성·수정 API와 `useOfficeTodos` controller, Issue #95
- AI 제안 또는 산출물: red-panda 기본 선택 상수와 회귀 테스트, TODO 생성·상태 변경·공개 전환 패널, gray-cat 보류 정책 문서
- 팀원 검토·수정 내용: gray-cat 원본을 크롭 좌표로 임시 매핑하는 방식은 사용하지 않는다. 표준 `1536 x 1024 / 6 x 4 / 256px` 시트를 받은 뒤 다시 적용한다.
- 검증 결과: avatar 단위 테스트, Client·Server typecheck, Client production build 통과. 브라우저 UI 수동 확인은 별도 진행한다.
- 관련 Issue / PR / Discussion: Issue #95

### 2026-08-18 - 회의방 참가자 전원 자동 통역 에이전트

- 사용한 Agent / Skill: Claude Code / Commit Convention Skill
- 사용 목적: 참가자마다 로컬에서 스크립트를 직접 실행해야 했던 방식을 없애고, 브라우저만 열면 통역되도록 회의방에 자동으로 들어가는 에이전트 구성
- 입력 맥락: 기존 `stt.py`/`translator.py`/`session.py`/`pipeline.py`, `apps/server`가 LiveKit 참가자에 실어 보내는 `preferredLanguage`/`participantCountry` attributes, Issue #72·#76·#81 선행 결과
- AI 제안 또는 산출물: 마이크 대신 LiveKit 참가자 오디오를 받는 `AudioSource` 주입 구조, 참가자별 통역 세션을 여는 `TranslationAgent`, 통역 대상 회의방 판별, `docs/ADR/0003` 작성
- 팀원 검토·수정 내용: 밀린 오디오는 큐가 차면 가장 오래된 것을 버리도록(대기하면 방 전체 오디오 수신이 끊김) 설계를 정했고, 워커 정지는 `asyncio.to_thread`로 돌려 같은 이유의 정지를 피했다. `close()`가 꽉 찬 큐에 블로킹 `put`을 해 영원히 멈추는 교착을 테스트 타임아웃으로 발견해 플래그 기반으로 고쳤다.
- 검증 결과: `pytest` 313건 통과(신규 56건). 실제 LiveKit 방에 브라우저로 접속해 터미널 명령 없이 자막이 뜨는 것 확인. 짧은 조각 번역 지어냄(Issue #101)과 지연 증가는 제한사항으로 남김.
- 관련 Issue / PR / Discussion: Issue #99, PR #100

### 2026-08-18 - 통역 에이전트를 LiveKit 워커로 전환

- 사용한 Agent / Skill: Claude Code / Commit Convention Skill
- 사용 목적: 회의 때마다 에이전트를 직접 켜고 꺼야 했던 방식을, 한 번 켜두면 회의방이 열릴 때 자동 배정받는 워커 방식으로 전환
- 입력 맥락: PR #100 결과물, `livekit-agents` 프레임워크의 `cli.run_app`/`WorkerOptions`, 배포 환경(Vercel Client + Render Server) 실측
- AI 제안 또는 산출물: `request_fnc` 기반 회의방 배정 수락/거부, 환경변수로 옮긴 설정, README·ADR 0003 갱신
- 팀원 검토·수정 내용: 실행 중 발견한 버그 3건을 사용자와 함께 확인 후 수정 — 참가자 퇴장 처리가 `Room` 객체에 없는 `.loop` 속성 접근으로 통째로 안 돌던 것(같은 자리에서 두 번째 실수라 방 이벤트 연결을 스크립트에서 모듈로 옮기고 가짜 방으로 테스트 추가), CPU 부하 게이팅이 워커 한 대뿐인 상황에서 배정 자체를 막던 것(`TRANSLATION_LOAD_THRESHOLD` 무제한으로 완화), `PIPELINE_SERVER_URL` 미설정 시 자막이 조용히 로컬로만 발행되던 것(경고 로그 추가). 실행 중 별도로 발견한 두 문제(Issue #101, #103)는 범위를 분리해 후속 Issue로 뺐다.
- 검증 결과: `pytest` 327건 통과(신규 14건, 버그 1 회귀 테스트 포함). 배포 환경에서 브라우저만으로 회의 입장·자막 발행·회의 종료까지 확인. 보고된 15~50초 배정 지연은 재현되지 않았다.
- 관련 Issue / PR / Discussion: Issue #102, PR #104

### 2026-08-18 - 말이 끝나도 자막이 임시로 남던 문제 수정

- 사용한 Agent / Skill: Claude Code / Commit Convention Skill
- 사용 목적: Deepgram의 `speech_final`이 끝내 오지 않아 마지막 발화가 영영 미확정("조각") 상태로 남던 문제 해결
- 입력 맥락: PR #104 실행 중 배포 환경에서 발견(Issue #103), 기존 `TranslationSession`의 침묵 처리 없음, Issue #99의 번역 재사용 경로
- AI 제안 또는 산출물: 새 인식 결과 없이 `TRANSLATION_FINALIZE_AFTER_MS`가 지나면 스스로 닫는 경로, 참가자 퇴장으로 세션이 끝날 때 열린 발화를 닫는 경로, 모델을 다시 부르지 않고 `isFinal`/`revision`만 갱신해 재발행
- 팀원 검토·수정 내용: PR #105가 이미 병합된 브랜치를 base로 잡아 `dev`에 도달하지 못한 것을 Issue #103이 안 닫힌 것으로 발견해, 같은 커밋을 `dev` 기준으로 옮겨 PR #106으로 다시 올렸다.
- 검증 결과: `pytest` 342건 통과(신규 15건, 이미 확정된 발화 재발행 방지·침묵 반복에도 한 번만 닫힘 포함). 실제 회의로 확정 전환 여부를 확인하는 수동 검증은 아직 하지 않음(제한사항으로 기록).
- 관련 Issue / PR / Discussion: Issue #103, PR #106

### 2026-08-18 - 짧거나 끊긴 중간 결과가 없는 내용을 지어내던 문제 수정

- 사용한 Agent / Skill: Claude Code / Commit Convention Skill
- 사용 목적: 중간 결과 번역 시 짧은 조각이나 그 자체로 뜻이 통하는 마지막 단어를 모델이 완결된 문장(요청·지시)으로 지어내던 문제 해결
- 입력 맥락: Issue #101(PR #100 실행 중 발견), 배포 환경 실측 로그의 중간 결과 전체를 길이순으로 정리한 표
- AI 제안 또는 산출물: "끊긴 자리는 끊긴 채로 옮기고 뒷말을 지어내 완결된 문장으로 만들지 마라"로 바꾼 프롬프트 규칙, `TRANSLATION_MIN_INTERIM_CHARS`(기본 4자) 최소 길이 필터, 확정된 조각은 짧아도 그대로 번역하는 예외
- 팀원 검토·수정 내용: Issue가 전제한 "최소 길이만으로 충분하다"는 것이 실측 로그 대조 결과 틀렸음을 확인 — 16자짜리도 지어낸 사례가 있어 프롬프트 규칙을 함께 고치기로 정했다.
- 검증 결과: `pytest` 348건 통과(신규 6건, 최소 길이 필터·확정 조각 예외 포함). 프롬프트 변경 자체의 효과는 실제 회의에서 재현해야 확인되므로 미검증으로 남김.
- 관련 Issue / PR / Discussion: Issue #101, PR #107

### 2026-08-18 - 발화의 첫 번역 호출에 이중 요청 적용

- 사용한 Agent / Skill: Claude Code / Commit Convention Skill
- 사용 목적: 브라우저에 처음 뜨는 자막(rev1)의 지연 편차를 줄임
- 입력 맥락: 클라우드 배포(India 리전) 실측에서 rev1만 따로 뽑은 값(평균 1701ms, 최소 843ms, 최대 3229ms), 맥락 턴 수와 호출 간격은 이미 원인이 아님을 확인한 결과, `Translator` 인터페이스(ADR 0001)
- AI 제안 또는 산출물: `hedge_after_ms` 안에 응답 없으면 같은 요청을 하나 더 보내 먼저 오는 걸 쓰는 `HedgedTranslator`, 발화당 첫 호출(`revision == 1`)에만 적용하는 범위 제한, `TRANSLATION_HEDGE_AFTER_MS` 환경변수
- 팀원 검토·수정 내용: 사용자가 맥락 턴 수를 원인으로 재차 의심할 때마다 실측 데이터로 반박해 결론을 유지했다. "특정 시간 안에 안 오면 그냥 패스하는 것과 뭐가 다르냐"는 질문에, `max_staleness`는 응답을 받은 뒤 폐기하는 사후 처리이고 이중 요청은 기다리는 도중에 미리 하나 더 보내는 사전 처리로 서로 다르다는 것을 정리했다. 로컬 워커로 빠르게 테스트하려던 것을, 클라우드 실측과 비교가 안 된다는 이유로 배포 브라우저 재현으로 바꿨다. 배포 파일(Dockerfile 등)과는 별도 커밋으로 분리했다.
- 검증 결과: `pytest` 359건 통과(신규 11건). 배포 브라우저에서 이중 요청 켜기 전/후 각 10건씩 실측 — 평균 1701ms→1398ms(18% 감소), 최대 3229ms→2228ms(31% 감소), 10건 중 6건 발동. 두 세션 모두 같은 방향으로 개선.
- 관련 Issue / PR / Discussion: Issue #118, PR #119

### 2026-08-18 - LiveKit Cloud에 통역 워커 배포

- 사용한 Agent / Skill: Claude Code / Commit Convention Skill
- 사용 목적: 노트북을 항상 켜두지 않아도 통역 워커가 동작하도록 LiveKit Cloud에 배포
- 입력 맥락: PR #104의 워커 전환 결과물, `lk` CLI(`lk cloud auth`, `lk agent create`, `lk agent deploy`), 사용자가 팀원에게서 받은 LiveKit Cloud 계정 접근 권한
- AI 제안 또는 산출물: 수동 작성한 `Dockerfile`(자동 생성기가 이 저장소 구조에서 멈춰 대체), `.dockerignore`, `lk agent create`가 만든 `livekit.toml`
- 팀원 검토·수정 내용: `lk agent create --secrets-file .env`가 빈 값의 환경변수에서 실패하는 CLI 버그를 발견해 `.env`의 빈 `ANTHROPIC_API_KEY=` 줄을 제거했다. 컨테이너 stdout이 TTY가 아니라 기본 블록 버퍼링되어 `lk agent logs`에 로그가 안 보이던 것을 `PYTHONUNBUFFERED=1`로 해결했다.
- 검증 결과: `lk agent deploy`로 배포 후 `lk agent logs`로 실시간 로그 확인. 배포된 워커로 실제 회의방 접속해 자동 배정과 자막 동작 확인. 로컬 노트북을 끈 상태에서도 통역이 계속 동작하는 것 확인.
- 관련 Issue / PR / Discussion: Issue #120, PR #121

### 2026-08-18 - vi_ko.md 관용구 초안과 번역 정확도 AI 교차검증

- 사용한 Agent / Skill: Claude Code
- 사용 목적: 베트남어→한국어 관용구 지침(`vi_ko.md`)이 비어 있던 것을 원어민 없이도 임시로 채우고, 실제 파이프라인 번역 품질을 원어민 검토 전 단계에서 가늠할 방법을 만든다
- 입력 맥락: Issue #18(원어민 검토와 vi_ko 작성이 완료 기준), 기존 `ko_vi.md`, 배포된 LiveKit Cloud 워커
- AI 제안 또는 산출물:
  - `ko_vi.md`를 뒤집어 만든 `vi_ko.md` 초안(유보 표현·노고 표현·인사와 요청)
  - 두 방향 사전 문장을 포함한 마이크 테스트 대사 24개(짧은 문장 + 문맥 있는 긴 문장)
  - 실제 배포 브라우저 발화 로그에서 STT 인식 오류 5건을 찾아 번역 채점에서 제외하는 처리
  - Gemini/GPT/Claude 3사에 같은 프롬프트로 19개 번역쌍을 독립 채점시켜 평균·격차를 낸 결과(평균 89.4점, 격차 20점 이상 2건)
  - Deepgram 공개 WER, Gemini 3.1 Flash-Lite 모델 카드, 외부 번역 벤치마크(Alconost)를 참고자료로 조사
- 팀원 검토·수정 내용:
  - 처음엔 "정확도 %"로 표현하려 했으나, 정답(기준 번역)이 없다는 것을 사용자가 지적해 "여러 채점자가 얼마나 같은 판단을 내리는가"로 방향을 바꿨다
  - `ko_vi.md` 문장을 그대로 역번역(Claude가 새로 번역)하려던 초기 방식을, 사용자가 "실제 파이프라인이 낸 진짜 번역 결과로 평가해야 의미 있다"고 정정해 실제 발화 테스트로 바꿨다
  - GPT 교차검증에 쓸 OpenAI API 키가 프로젝트에 없어, 프로그램 호출 대신 사용자가 각 서비스 웹 UI에 직접 채점 프롬프트를 붙여넣는 방식으로 바꿨다
  - 음성 인식 자체가 원문과 다르게 인식된 경우(성조 오인식 등 5건)는 번역 품질 문제가 아니라는 사용자 지적에 따라 채점 대상에서 제외했다
  - `Closes #126`으로 PR #127을 병합했는데, 그 PR은 완료 기준 4개 중 1개(초안 작성)만 끝낸 상태였다. 이슈를 다시 열어 나머지 3개를 마친 뒤 재종료했다
  - 결과를 Issue 코멘트에 다 적지 않고 GitHub Discussion으로 옮겨 정리하도록 사용자가 방향을 바꿨다
  - Gemini 선택 근거를 사후 벤치마크로 재구성하려 한 것에 대해, `docs/ADR/0001`의 실제 기록(비용 문제)과 다르다는 것을 확인하고 "원래 이유(비용)와 사후 참고자료(품질)는 다르다"고 구분해서 정리했다
- 검증 결과: 실제 배포 브라우저에서 24개 발화로 파이프라인을 실행해 로그를 확보했다. Gemini/GPT/Claude 3사 채점 결과를 직접 집계해 평균·격차를 계산했다(코드로 재현 가능). STT 오류 5건은 의도한 원문과 인식 결과를 대조해 확인했다. 원어민 검토는 이 작업의 범위가 아니며 Issue #18에 남아 있다.
- 관련 Issue / PR / Discussion: Issue #18, Issue #126, PR #127, Discussion #129

### 2026-08-19 - 회의실 구역 진입 기반 LiveKit 세션 생명주기 연결

- 사용한 Agent / Skill: Codex / Project Workflow Skill
- 사용 목적: 오피스 Meeting Room 구역에 들어갈 때 `/meeting-lab` 페이지 전환 없이 카메라·마이크 권한 확인과 LiveKit 회의 연결을 자동으로 시작한다.
- 입력 맥락: Issue #131, 상위 Issue #136, `MeetingLabPage`, `useLiveKitMeetingSession`, `VirtualOffice.onMeetingRoomState`, `docs/PRD.md` F5
- AI 제안 또는 산출물: MeetingLab의 권한 확인·토큰 요청·LiveKit 연결 흐름을 `useMeetingSessionController`로 분리하고, `idle/requesting-permission/connecting/connected/leaving/failed` 전이를 순수 함수와 테스트로 추가했다. 오피스 Meeting Room 구역 진입·이탈에 같은 컨트롤러를 연결하고, 원격 오디오 autoplay 차단 시 사용자 클릭으로 재생을 재시도하는 경로를 추가했다.
- 팀원 검토·수정 내용: 사용자가 “1차 작업부터 진행”을 지시했고, 1차 범위는 참가자 스트립·채팅·AI 번역 ON/OFF가 아니라 구역 진입 기반 세션 생명주기 자동화로 고정했다.
- 검증 결과: 작업 중 로컬 타입체크와 빌드를 실행해 결과를 확인한다. 실제 두 브라우저 영상·음성 송수신과 브라우저 권한 UI는 사람이 로컬 환경에서 추가 확인해야 한다.
- 관련 Issue / PR / Discussion: Issue #131, Issue #136
