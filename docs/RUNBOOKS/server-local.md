# Server Local Runbook

> 작성자: Codex
>
> 작성일: 2026-08-15
>
> 마지막 업데이트: 2026-08-16
>
> 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/2

## 목적

NestJS 기반 `apps/server`를 로컬에서 설치, 검증, 실행하는 절차를 정리한다. 실제 API 키와 `.env` 값은 Git에 커밋하지 않는다.

## 사전 조건

- Node.js 22 이상
- pnpm 10 이상
- 개발용 LiveKit 프로젝트의 URL, API Key, API Secret
- Supabase 프로젝트 URL과 서버 전용 Secret Key

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
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=
```

서버는 시작할 때 `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` 값을 검증한다. `SUPABASE_SECRET_KEY`는 Server와 Render에만 두고 Client나 Vercel 환경변수에 넣지 않는다.

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

## 오피스 영속화 API 확인

먼저 `POST /office/session`으로 게스트 멤버를 만들거나 기존 멤버를 복구한다. 응답의 `guestToken`과 `member.id`는 이후 출퇴근·상태 갱신 요청에 함께 사용한다.

```bash
curl -X POST http://localhost:4000/office/session \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Demo Member","countryCode":"KR","language":"ko"}'
```

출근 상태 예시:

```bash
curl -X PATCH http://localhost:4000/office/members/<member-id>/attendance \
  -H "Content-Type: application/json" \
  -d '{"guestToken":"<guest-token>","attendanceStatus":"working"}'
```

이 API는 workspace와 기본 desk를 처음 한 번 생성하고, 같은 `guestToken`으로 재요청하면 같은 멤버·아바타·desk를 반환한다. Socket 연결, heartbeat, disconnect 상태 반영은 별도 구현 범위다.
