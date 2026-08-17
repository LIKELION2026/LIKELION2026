# AI Agent Workflow

> 작성자: Project Team
>
> 마지막 업데이트: 2026-08-17

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
