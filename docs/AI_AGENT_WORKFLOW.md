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
