# Server Local Runbook

> 작성자: Codex
>
> 작성일: 2026-08-15
>
> 마지막 업데이트: 2026-08-15
>
> 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/2

## 목적

NestJS 기반 `apps/server`를 로컬에서 설치, 검증, 실행하는 절차를 정리한다. 실제 API 키와 `.env` 값은 Git에 커밋하지 않는다.

## 사전 조건

- Node.js 22 이상
- pnpm 10 이상
- 개발용 LiveKit 프로젝트의 URL, API Key, API Secret

Windows PowerShell에서 `pnpm` 실행이 정책으로 막히면 `pnpm.cmd`를 사용한다.

## 설치

```bash
pnpm install
```

## 환경변수

`apps/server/.env.example`을 기준으로 `apps/server/.env.local`을 만들고 개발용 값을 채운다.

```env
LIVEKIT_URL=wss://development-project.livekit.cloud
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
```

서버는 시작할 때 `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` 값을 검증한다.

## 검증

```bash
pnpm typecheck
pnpm build
```

## 실행

```bash
pnpm dev:server
```

기본 포트는 `4000`이다. 정상 실행 후 `GET /health`로 서버 상태를 확인한다.
