# Project Agent Guide

이 문서는 프로젝트에서 작업하는 모든 AI Agent의 공통 규칙을 정의한다.

## Read First

작업을 시작하기 전에 아래 파일을 확인한다.

1. `docs/CONVENTIONS.md`
2. `docs/PRD.md`가 존재하면 해당 파일
3. 관련 Issue, Discussion, Figma 링크
4. 수정 대상 모듈의 인접 코드와 테스트

## Repository Boundaries

```text
apps/client/      React + Phaser 가상 오피스와 사용자 경험
apps/server/      NestJS API, Socket, 외부 서비스, AI 기능
packages/shared/  공통 타입, DTO, Socket 이벤트, 상수
docs/             제품과 협업 기록
```

- Client와 Server 사이의 계약은 `packages/shared`에 둔다.
- 다른 앱 내부 코드를 직접 import하지 않는다.
- 환경변수, API 키, 녹취 원본, 개인 정보는 커밋하지 않는다.
- 기존 사용자 변경이나 다른 팀원의 변경을 되돌리지 않는다.

## Working Protocol

1. 요청의 사용자 문제와 완료 기준을 확인한다.
2. 구현 범위가 넓거나 선택지가 있으면 Issue 또는 Discussion에 결정 근거를 남긴다.
3. 작은 목적의 브랜치에서 작업한다.
4. 변경한 동작에 맞는 타입, 오류 상태, 문서를 함께 갱신한다.
5. 로컬 검증을 수행하고 결과를 PR에 남긴다.
6. 구현 PR의 본문에는 `Closes #<Issue 번호>`를 작성한다. `Refs #번호`만으로는 Issue가 자동 종료되지 않으므로 사용하지 않는다.
7. `dev` 병합 뒤 연결 Issue가 자동 종료됐는지 확인하고 GitHub Project 상태를 갱신한다.
8. 실제로 한 작업만 기록한다. 존재하지 않는 인터뷰, 테스트, 리뷰, AI 사용 기록을 만들지 않는다.

## Commit Protocol

커밋을 준비하거나 생성하라는 요청을 받으면 `.agents/skills/commit-convention/SKILL.md`를 먼저 읽고 따른다.

- 커밋 전에는 변경사항을 목적별로 나눈 상세 커밋 계획을 사용자에게 먼저 제시한다.
- 계획에는 커밋 순서, 메시지, 포함 파일, 분리 이유, 검증 방법을 포함한다.
- 사용자가 계획을 명시적으로 승인하기 전에는 `git add` 또는 `git commit`을 실행하지 않는다.
- 승인 후에도 staged diff가 계획과 달라지면 다시 사용자 검토를 요청한다.
- 하나의 커밋에는 하나의 검토 가능한 목적만 포함한다.
- 커밋 메시지는 `docs/CONVENTIONS.md`의 형식을 따른다.
- 실제로 실행하지 않은 테스트나 리뷰를 커밋 또는 PR 기록에 적지 않는다.

## AI Usage Record

AI를 사용해 제품 기획, 코드, 테스트 데이터를 만들거나 검토했다면 `docs/AI_AGENT_WORKFLOW.md`의 로그 형식에 맞춰 목적, 사람의 검토, 반영 결과를 남긴다.

프로젝트 전용 Skill은 `.agents/skills/project-workflow/SKILL.md`에 있다. 기능 기획, 구현, 검증, 협업 기록 정리에 사용할 수 있다.
