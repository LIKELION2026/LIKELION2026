# Office Todo Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** red-panda 기본 아바타 정책 아래 사용자가 자신의 TODO를 작성·공개·갱신한다.

**Architecture:** 서버의 `selectNewGuestAvatarId()`가 `office-avatar`를 고정 반환한다. Client는 기존 `useOfficeTodos` controller의 생성·수정·새로고침 기능을 `OfficeTodoPanel`에 연결하고, 피플 패널은 기존 공개 TODO 목록만 읽는다.

**Tech Stack:** NestJS, React, TypeScript, Node test runner

## Verification

- [x] `office-avatar` 단위 테스트를 red-panda 기본값으로 변경해 실패·통과를 확인한다.
- [x] Client와 Server typecheck를 실행한다.
- [x] Client production build를 실행한다.
- [ ] 브라우저에서 TODO 생성, 상태 변경, 공개 전환, 타인 공개 TODO 표시를 확인한다.
