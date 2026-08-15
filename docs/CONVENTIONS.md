# Project Convention

> 프로젝트의 공통 작업 규칙입니다.

## 1. 기본 원칙

- 모든 작업은 문제, 담당자, 결과를 추적할 수 있어야 한다.
- 기록은 심사를 위한 형식이 아니라 실제 의사결정과 구현 근거를 남기는 수단이다.
- AI는 구현과 검토를 돕지만, 최종 판단과 검증은 담당 팀원이 한다.
- 작은 작업도 Issue, PR, 문서 중 적절한 위치에 맥락을 남긴다.
- 커밋 수를 늘리기 위한 의미 없는 분할이나 형식적인 리뷰는 하지 않는다.

## 2. Monorepo 구조

프로젝트는 Moyo와 같은 pnpm 기반 monorepo 구조를 사용한다.

```text
.
├── apps/
│   ├── client/             # React + Phaser 기반 가상 오피스 클라이언트
│   └── server/             # NestJS API, Socket, 외부 서비스, AI 기능
├── packages/
│   └── shared/             # 공통 타입, 상수, 이벤트 계약
├── docs/                   # 제품, 디자인, 기술, 협업 기록
└── README.md
```

### 패키지 경계

- `apps/client`는 화면, 사용자 상호작용, 실시간 상태 렌더링을 담당한다.
- `apps/server`는 인증, 데이터, 실시간 이벤트, 외부 서비스, AI 요청을 담당한다.
- `packages/shared`는 클라이언트와 서버가 함께 사용하는 타입, DTO, Socket 이벤트 이름, 상수를 둔다.
- 다른 앱의 내부 코드를 직접 import하지 않는다. 공통 계약은 반드시 `packages/shared`로 이동한다.
- 환경변수와 비밀 키는 어떤 패키지에서도 Git에 커밋하지 않는다.

## 3. 작업 흐름

```text
Discussion 또는 Issue 생성
→ 담당자와 완료 기준 합의
→ 브랜치 생성
→ 구현 및 테스트
→ Pull Request 작성
→ 최소 1명 리뷰
→ 수정 및 검증
→ Merge 후 Project 상태 업데이트
```

### 작업 시작 전

다음 중 하나를 남긴다.

- 기능, 버그, 문서화 작업: GitHub Issue
- 방향 선택, 리서치, 기술 검토: GitHub Discussion
- 긴급한 작은 수정: PR 설명에 문제와 이유를 명시

Issue에는 아래 항목을 작성한다.

```text
문제:
작업 범위:
완료 기준:
담당자:
관련 문서 / Figma / Discussion:
```

## 4. 브랜치 규칙

브랜치는 `main`에서 만들고, 하나의 목적만 가진다.

```text
feat/live-translation
feat/meeting-summary
fix/subtitle-sync
refactor/shared-socket-events
docs/prd-update
design/office-status
chore/env-example
```

사용 가능한 접두사는 아래와 같다.

- `feat/`: 사용자 기능 추가
- `fix/`: 버그 수정
- `refactor/`: 동작을 바꾸지 않는 구조 개선
- `docs/`: 문서 변경
- `design/`: 디자인 시스템 또는 화면 명세 변경
- `chore/`: 설정, 의존성, 개발 환경 변경

## 5. 커밋 규칙

커밋은 실제로 검토 가능한 최소 작업 단위로 작성한다.

```text
feat(auth): 로그인 완료 후 사용자 정보 저장
feat(ai): AI 결과 검토 화면 추가
fix(socket): 재연결 시 상태 동기화 오류 수정
refactor(shared): 공통 이벤트 타입 패키지로 이동
docs(prd): 사용자 문제정의 수정
style(ui): 상태 아이콘과 범례 적용
```

형식은 아래를 따른다.

```text
<type>(<scope>): <한국어 작업 요약>
```

### 커밋 금지 항목

- `fix`, `update`, `수정`처럼 내용이 드러나지 않는 메시지
- 관련 없는 파일을 한 커밋에 섞는 행위
- 동작하지 않는 중간 결과를 기본 브랜치에 반영하는 행위
- 비밀 키, `.env`, 개인 설정 파일 커밋

### 커밋 전 확인

커밋을 준비하는 AI Agent는 `.agents/skills/commit-convention/SKILL.md`를 먼저 따른다.

```text
작업 목적과 관련 Issue 확인
→ 변경사항을 목적별 커밋 계획으로 분리
→ 사용자 검토 및 명시적 승인
→ 순서대로 staging
→ staged diff 재확인
→ 필요한 검증 실행
→ 커밋
```

### 사용자 검토 필수

AI Agent는 사용자 승인 없이 변경사항을 staging하거나 커밋하지 않는다.

커밋 전 계획에는 반드시 아래 내용을 포함한다.

```text
커밋 번호와 순서:
커밋 메시지:
포함 파일:
분리 이유:
검증 방법:
```

사용자는 계획을 검토한 뒤 전체 계획 또는 특정 커밋만 승인할 수 있다. 승인 이후 변경사항이 추가되거나 파일 구성이 달라지면 Agent는 계획을 다시 제시한다.

### 상세 분리 기준

기록을 남기기 위해 커밋을 세분화하되, 독립적으로 이해할 수 없는 단위로 쪼개지 않는다.

- 문서, Agent 설정, Git Hook, 의존성·개발 환경 변경은 각각 분리한다.
- `packages/shared` 계약 변경은 Client·Server 구현보다 먼저 분리한다.
- Client 화면 구현, Server API 구현, 테스트·검증 코드는 독립 검토가 가능하면 분리한다.
- 기능에 반드시 함께 필요한 타입과 오류 처리는 같은 커밋에 포함한다.
- 단순 포맷 변경이나 파일 이동은 기능 변경과 분리한다.
- 각 커밋은 왜 필요한지 한 문장으로 설명할 수 있어야 한다.

저장소의 `.githooks/commit-msg`는 커밋 메시지의 기본 형식을 검증한다. 팀원은 저장소를 받은 뒤 아래 설정을 한 번 실행한다.

```bash
git config core.hooksPath .githooks
```

### 병합 전략

모든 PR은 기본적으로 GitHub의 `Create a merge commit` 방식, 즉 `Merge pull request`를 사용한다. 이 방식으로 PR 단위와 개별 커밋의 협업·구현 기록을 함께 보존한다.

- `Rebase and merge`와 `Squash and merge`는 기본 병합 방식으로 사용하지 않는다.
- 병합 전 PR 제목, 설명, 연결 Issue, 검증 결과가 실제 변경사항과 일치하는지 확인한다.
- 병합 뒤에는 관련 Issue와 GitHub Project 상태를 업데이트한다.

## 6. Pull Request 규칙

PR은 기능을 병합하기 전 팀이 맥락과 결과를 함께 확인하는 기록이다.

PR 설명에는 아래 항목을 포함한다.

```md
## 변경 내용

## 변경 이유

## 관련 Issue / Discussion

## 확인 방법

## 화면 또는 데모 자료

## 남은 작업 및 제한사항
```

저장소의 `.github/pull_request_template.md`를 사용해 위 내용을 작성한다. 디자인 PR은 `.github/PULL_REQUEST_TEMPLATE/design.md`, 개발 PR은 `.github/PULL_REQUEST_TEMPLATE/development.md`를 선택해 작성한다. Issue는 작업 성격에 맞는 `.github/ISSUE_TEMPLATE` 양식을 사용한다.

- 기능 PR은 최소 1명 이상이 리뷰한다.
- 화면이 바뀌면 이미지, GIF 또는 짧은 영상 링크를 첨부한다.
- API 계약이 바뀌면 `packages/shared` 타입과 API 명세를 함께 수정한다.
- 리뷰어는 코드 스타일보다 기능 정확성, 예외 처리, 사용자 흐름, 문서와의 일치를 먼저 확인한다.

## 7. 코드 규칙

### 공통

- TypeScript를 기본 언어로 사용한다.
- 변수와 함수는 역할이 드러나는 영어 이름을 사용한다.
- 사용자에게 보이는 문구는 한국어를 기본으로 하되, 다국어 확장을 고려해 한곳에서 관리한다.
- 복잡한 로직에는 이유 중심의 짧은 주석을 남긴다.
- 화면, API, 데이터 타입의 이름은 같은 도메인 용어를 사용한다.

### Client

- 기능 단위 코드는 `apps/client/src/features`에 둔다.
- 도메인 모델과 상태는 `entities`, 재사용 UI는 `widgets` 또는 `shared`에 둔다.
- 서버 응답 타입을 임의로 다시 정의하지 않고 `@shared` 타입을 사용한다.
- 로딩, 빈 상태, 오류 상태를 기능 구현과 함께 고려한다.

### Server

- NestJS 모듈은 도메인 단위로 분리한다.
- Controller는 요청과 응답, Service는 비즈니스 로직을 담당한다.
- AI 제공자와 외부 API 접근은 전용 모듈과 Service 안에 둔다.
- 환경변수는 `ConfigService`로만 읽고, 필요한 값은 서버 시작 시 검증한다.

### Shared

- Socket 이벤트 이름, 공통 상태, DTO, 상수는 `packages/shared`에서 관리한다.
- 공통 타입 변경은 Client와 Server 영향을 함께 확인한다.

## 8. AI 기능 구현 규칙

- AI 기능은 해결하려는 사용자 문제, 입력 데이터, 출력 형식, 실패 시 동작을 먼저 정의한다.
- AI가 생성한 결과는 사용자가 확인·수정할 수 있어야 한다.
- AI는 근거가 없는 정보를 확정적으로 말하지 않는다.
- 프롬프트, 입력 데이터, 모델 출력 한계, 검증 방법은 `docs/AI_AGENT_WORKFLOW.md`에 기록한다.

## 9. 문서 규칙

`docs`에는 제품과 구현의 근거를 남긴다.

```text
docs/
├── CONVENTIONS.md
├── PRD.md
├── TEAM_RULES.md
├── DESIGN_SYSTEM.md
├── DOCUMENTATION_GUIDE.md
├── PROJECT_STRUCTURE_GUIDE.md
├── AI_AGENT_WORKFLOW.md
├── ARCHITECTURE.md
├── FEATURES/
├── RESEARCH/
├── ADR/
├── MEETINGS/
├── RUNBOOKS/
└── DEMO_SCENARIO.md
```

기능별 구현 문서와 학습 기록의 분리 기준은 `docs/DOCUMENTATION_GUIDE.md`를 따른다.

팀원이 초기 구조와 작업 흐름을 빠르게 확인할 때는 `docs/PROJECT_STRUCTURE_GUIDE.md`를 먼저 읽는다.

문서 첫 부분에는 가능한 한 아래 메타데이터를 작성한다.

```text
작성자:
최종 수정자:
작성일:
마지막 업데이트:
관련 Issue / PR / Discussion:
```

### ADR

중요한 기술·제품 선택은 `docs/ADR`에 남긴다.

```text
문제:
결정:
대안:
결정 이유:
영향:
```

예시:

- 외부 서비스 또는 라이브러리를 선택한 이유
- AI 기능의 MVP 범위
- 공통 타입과 이벤트 계약을 분리한 이유

## 10. 회의와 디자인 협업

- 회의가 끝난 뒤 24시간 안에 회의록을 남긴다.
- 회의록에는 결정사항, 담당자, 마감일, 보류 사항을 포함한다.
- Figma 변경은 관련 Issue 또는 PR에 링크한다.
- 디자인 토큰, 컴포넌트 상태, 반응형 규칙은 `docs/DESIGN_SYSTEM.md`에 기록한다.
- 구두 또는 개인 메시지로 결정한 내용도 최종 결정은 공개 문서나 Issue에 남긴다.

## 11. 완료 기준

작업은 코드가 작성된 시점이 아니라 아래 항목이 충족됐을 때 완료다.

- Issue에 작성한 완료 기준 충족
- 필요한 타입과 문서 반영
- 로컬에서 동작 확인
- 오류, 로딩, 빈 상태 확인
- PR 리뷰 반영
- GitHub Project 상태 업데이트

## 12. 팀 협업 원칙

- 역할과 관계없이 각 팀원은 문제정의, 리뷰, 의사결정에 참여한다.
- 디자인, 프론트엔드, 백엔드, AI 작업은 서로 링크되어야 한다.
- 다른 팀원의 작업을 대신 완료한 경우에는 PR과 Issue에 실제 기여 내용을 남긴다.
- 막힌 작업은 숨기지 않고 Issue 또는 회의록에 기록해 팀의 도움을 요청한다.
- 작업 기록은 실제 구현 과정을 보여줘야 하며, 존재하지 않는 논의·리뷰·기여를 만들지 않는다.
