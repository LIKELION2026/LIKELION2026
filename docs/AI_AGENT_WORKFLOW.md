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
