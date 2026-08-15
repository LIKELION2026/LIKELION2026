# Project Structure Guide

> 작성자: Project Team
>
> 작성일: 2026-08-15
>
> 마지막 업데이트: 2026-08-15
>
> 관련 Issue / PR / Discussion: 추후 연결

## 이 문서의 목적

처음 저장소에 들어온 팀원이 '어디서 무엇을 해야 하는지'를 빠르게 이해하도록 돕는 안내서다. 세부 규칙은 각 문서가 기준이며, 이 문서는 그 문서들로 가는 출발점이다.

## 지금 저장소에 있는 것

현재는 초기 협업 환경 위에 `packages/shared`와 `apps/server`의 백엔드 기반 구조를 추가한 단계다. Client 앱과 실제 기능 코드는 구현 범위가 생길 때 순서대로 추가한다.

```text
.
├── AGENTS.md                     # 모든 AI Agent의 공통 작업 규칙
├── CLAUDE.md                     # Claude Code용 프로젝트 규칙
├── .agents/skills/               # 프로젝트 전용 Agent Skill
├── .githooks/commit-msg          # 커밋 메시지 형식 검사
├── .github/                      # PR·Issue 템플릿
├── docs/                         # 제품, 기술, 협업 기록
├── packages/shared/              # 공통 타입, DTO, Socket 이벤트 계약 초안
├── apps/server/                  # NestJS 서버 초기 세팅과 meeting 토큰 API
└── README.md                     # 저장소 첫 안내
```

## 앱 구현을 시작하면 만들 구조

프로젝트는 pnpm monorepo로 구성한다. 각 앱은 다른 앱의 내부 코드를 직접 가져오지 않고, 공유 계약은 `packages/shared`를 통해 사용한다.

실제 폴더 책임과 기능 배치 기준은 [STRUCTURE.md](STRUCTURE.md)를 따른다.

```text
.
├── apps/
│   ├── client/                   # React + Phaser 사용자 화면과 가상 오피스
│   └── server/                   # NestJS API, Socket, AI·외부 서비스 연결
├── packages/
│   └── shared/                   # 공통 타입, DTO, Socket 이벤트, 상수
├── docs/
├── .github/
├── .agents/
└── .githooks/
```

| 위치 | 담당하는 일 | 주의할 점 |
| --- | --- | --- |
| `apps/client` | 화면, 사용자 상호작용, 실시간 상태 표시 | 서버 응답 타입을 다시 만들지 않고 Shared 타입을 사용한다. |
| `apps/server` | 인증, 데이터, 실시간 이벤트, AI·외부 API 호출 | 환경변수는 `ConfigService`로만 읽는다. |
| `packages/shared` | Client·Server 공통 타입과 이벤트 계약 | 계약 변경은 양쪽 영향과 문서를 함께 확인한다. |
| `docs` | 문제정의, 결정, 학습 기록, 운영 절차 | 확정된 내용과 조사 중인 내용을 구분한다. |

## 팀원이 처음 할 일

1. `README.md`와 이 문서를 읽는다.
2. [PRD.md](PRD.md)에서 해결하려는 문제와 P0 범위를 확인한다.
3. [CONVENTIONS.md](CONVENTIONS.md)에서 브랜치, 커밋, PR 규칙을 확인한다.
4. 작업 성격에 맞는 GitHub Issue를 만든다.
5. Issue에 적은 범위만 담은 브랜치를 만들고 작업한다.
6. PR을 열어 팀원 리뷰 후 `Merge pull request`로 병합한다.

## 작업별로 어디에 기록할지

| 지금 하는 일 | 기록할 위치 |
| --- | --- |
| 사용자 문제, 기능 범위, MVP 우선순위 | `docs/PRD.md` |
| 기능 구현 방법과 시행착오 | `docs/FEATURES/<feature>/` |
| 기술 또는 제품 선택의 최종 이유 | `docs/ADR/` |
| 아직 결론나지 않은 API·UX 조사 | `docs/RESEARCH/` |
| 로컬 실행, 배포, 장애 대응 절차 | `docs/RUNBOOKS/` |
| 회의의 결정·담당자·보류 항목 | `docs/MEETINGS/` |
| 디자인 토큰, 컴포넌트, 반응형 기준 | `docs/DESIGN_SYSTEM.md` |
| AI Agent 사용 목적과 사람의 검토 | `docs/AI_AGENT_WORKFLOW.md` |

`docs/FEATURES`는 기술 이름이 아니라 사용자 기능 이름으로 만든다. 예를 들어 `virtual-office`, `realtime-meeting`, `ai-briefing`처럼 작성한다. 자세한 기준은 [DOCUMENTATION_GUIDE.md](DOCUMENTATION_GUIDE.md)를 참고한다.

## GitHub 사용법

### Issue

작업을 시작하기 전 Issue를 만든다.

- 기능: `기능 제안`
- 디자인: `디자인 작업`
- 개발: `개발 작업`
- 버그: `버그 제보`
- 문서·조사·설정: `작업 및 문서화`

각 양식은 문제와 할 일, 완료 기준만 짧게 작성한다. 방향을 정해야 하는 큰 선택은 Issue 대신 GitHub Discussion에서 논의한다.

### Pull Request

작업이 끝나면 목적에 맞는 PR 템플릿을 선택한다.

- 일반 작업: 공통 PR 템플릿
- 디자인 작업: `design.md`
- 개발 작업: `development.md`

PR에는 실제로 변경한 내용, 관련 Issue·Figma·Discussion, 실제 확인 방법만 적는다. 화면이 바뀌면 이미지나 짧은 영상도 첨부한다.

### 병합

- 최소 한 명의 팀원에게 리뷰를 받는다.
- 리뷰 반영과 검증이 끝나면 `Merge pull request`를 사용한다.
- 병합한 뒤 관련 Issue와 GitHub Project 상태를 업데이트한다.

## 커밋과 Hook 설정

커밋은 하나의 검토 가능한 목적만 담는다.

```text
feat(meeting): 실시간 자막 이벤트 추가
fix(socket): 상태 재연결 동기화 오류 수정
docs(prd): 회의 번역 완료 기준 보완
```

처음 한 번 아래 명령으로 커밋 메시지 검증 Hook을 활성화한다.

```bash
git config core.hooksPath .githooks
```

커밋 전에는 변경 목적, 포함 파일, 검증 방법을 팀원이 검토한다. AI Agent는 사용자 승인 없이 스테이징하거나 커밋하지 않는다.

## AI Agent 사용법

AI Agent로 작업할 때는 먼저 `AGENTS.md`를 읽는다. Claude Code를 사용하면 `CLAUDE.md`도 함께 확인한다.

- 기능 구현과 문서 작업: `.agents/skills/project-workflow/SKILL.md`
- 커밋 준비: `.agents/skills/commit-convention/SKILL.md`

AI가 제안한 코드와 문서는 반드시 담당 팀원이 검토한다. 실제로 사용한 Agent와 검토 결과는 `docs/AI_AGENT_WORKFLOW.md` 형식으로 남긴다.

## 하지 않는 것

- `.env`, API 키, 토큰, 개인 정보, 회의 원문을 Git에 올리지 않는다.
- 다른 앱 내부 코드를 직접 import하지 않는다.
- 구현하지 않은 기능, 테스트, 리뷰, AI 사용 기록을 실제로 한 것처럼 남기지 않는다.
- 커밋 수만 늘리기 위한 의미 없는 파일 분할을 하지 않는다.
