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

## 작업 기록

### 2026-08-15 - Virtual Office 디자인 핸드오프 초안

- 담당자: SubJeeLee
- 사용한 Agent / Skill: Codex, 상세 한국어 커밋 Skill
- 사용 목적: 디자인 팀이 P0 화면, 사용자 상태, 에셋 준비 기준을 빠르게 이해할 수 있는 문서 초안 작성
- 입력 맥락: 글로벌 원격 협업 가상 오피스 PRD, Virtual Office 구현 범위, Moyo 구조 조사 결과
- AI 제안 또는 산출물: 화면별 사용자 목적과 상태, Figma Frame 목록, 에셋 파일 형식·규격·용량 예산을 포함한 디자인 핸드오프 문서
- 팀원 검토·수정 내용: 사용자 요청에 따라 Socket, 엔진, 폴더 구조 등 개발 구현 설명을 줄이고 디자인 전달에 필요한 내용만 남김
- 검증 결과: Markdown diff 공백 검증 통과
- 관련 Issue / PR / Discussion: GitHub Project의 `Phaser 2D 가상 오피스 구조 구축` Draft Item 연결 예정
