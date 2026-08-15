# Project Claude Code Guide

먼저 `AGENTS.md`와 `docs/CONVENTIONS.md`를 읽고 따른다.

## Claude Code Working Rules

- 작업 전에는 수정 대상과 관련된 Issue, PRD, 인접 코드를 읽는다.
- 한 요청에서 관련 없는 리팩터링을 섞지 않는다.
- 구현 뒤에는 빌드, 타입 검사, 테스트 중 가능한 검증을 실행한다.
- 코드 생성 결과는 기존 구조와 타입 계약에 맞게 수정한 뒤 반영한다.
- 사용자 데이터, 회의 녹취, API 키를 예시·로그·커밋에 포함하지 않는다.

## Documentation

- 제품 또는 기술적 결정은 `docs/ADR/` 또는 Discussion에 남긴다.
- 기능 변경은 관련 Issue와 PR에 사용자 문제, 완료 기준, 검증 결과를 연결한다.
- AI가 작업을 보조했으면 `docs/AI_AGENT_WORKFLOW.md`에 실제 사용과 검토 결과를 남긴다.

## Commit Protocol

커밋을 준비하거나 생성하라는 요청을 받으면 `.agents/skills/commit-convention/SKILL.md`를 먼저 읽고 따른다.

- 커밋 순서, 메시지, 파일 목록, 분리 이유, 검증 방법이 포함된 계획을 먼저 제시한다.
- 사용자가 계획을 명시적으로 승인하기 전에는 `git add` 또는 `git commit`을 실행하지 않는다.
- 승인 후 staged diff가 계획과 달라지면 다시 검토를 요청한다.
- 하나의 커밋에는 하나의 검토 가능한 목적만 포함한다.
- 커밋 메시지는 `docs/CONVENTIONS.md`의 형식을 따른다.
- 실제로 실행하지 않은 테스트나 리뷰를 커밋 또는 PR 기록에 적지 않는다.
