# Client Local Runbook

> 대상: `apps/client`와 Virtual Office 초기 통합 환경

## 준비 사항

- Node.js 22 이상
- Corepack 활성화: `corepack enable`
- 의존성 설치: `corepack pnpm install`
- Server 실행에 필요한 `apps/server/.env` 설정

## 실행 순서

터미널 1에서 Server를 실행한다.

```bash
corepack pnpm dev:server
```

터미널 2에서 Client를 실행한다.

```bash
corepack pnpm dev:client
```

Client는 기본적으로 `http://localhost:5173`, Server는 `http://localhost:4000`을 사용한다.

## Client 환경 변수

`apps/client/.env.example`을 참고해 `apps/client/.env.local`에 Server 주소를 설정한다.

```bash
VITE_SERVER_URL=http://localhost:4000
```

## 빠른 검증

1. `http://localhost:5173/office?name=Korea-PM`을 연다.
2. 다른 브라우저 또는 시크릿 창에서 `http://localhost:5173/office?name=Vietnam-Dev`를 연다.
3. 두 사용자의 입장, 이동, 상태 변경을 확인한다.
4. 회의실에 들어가 `Meeting Lab`으로 이동한다.
5. 토큰 API 확인 버튼으로 `POST /meeting/token` 연결을 확인한다.

## 담당 경계

- Virtual Office 담당: 오피스 진입, Socket Presence, Phaser 화면
- Realtime Meeting 담당: Meeting Lab에 LiveKit 영상·음성·번역 자막 UI 연결
- 공통: `packages/shared` 이벤트와 payload 변경 전 합의
