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
`LIVEKIT_URL`은 `wss://`로 시작해야 한다.

## 검증

```bash
pnpm typecheck
pnpm test:server
pnpm build
```

## 실행

```bash
pnpm dev:server
```

`dev:server`는 서버를 띄우기 전에 `packages/shared`를 빌드해 런타임 계약을 최신 상태로 맞춘다. 기본 포트는 `4000`이다. 정상 실행 후 `GET /health`로 서버 상태를 확인한다.

## LiveKit token API 확인

Meeting Lab용 room 이름은 `lab-<team>-<yyyymmdd>-<slug>` 형식을 사용한다.

```powershell
$body = @{
  roomName = "lab-likelion-20260815-test"
  participantName = "Tester"
  participantCountry = "kr"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:4000/meeting/token" `
  -ContentType "application/json" `
  -Body $body
```

응답에는 LiveKit join token과 Server가 파생한 `participantIdentity`, `preferredLanguage`가 포함된다. token과 API secret은 로그, PR, 문서에 붙여 넣지 않는다.

## Mock subtitle API 확인

실제 STT/Translation Agent가 붙기 전에는 서버 mock API로 `subtitle.created` payload 모양을 확인한다.

```powershell
$body = @{
  roomName = "lab-likelion-20260815-test"
  speaker = @{
    participantIdentity = "tester-20260815"
    displayName = "Tester"
  }
  sourceLanguage = "ko"
  sourceText = "이번 배포는 금요일입니다."
  translatedLanguage = "en"
  translatedText = "The deployment is on Friday."
  isFinal = $false
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:4000/meeting/subtitles/mock" `
  -ContentType "application/json" `
  -Body $body
```

응답은 `eventName: "subtitle.created"`와 `payload`를 포함한다. 같은 payload는 `/meeting` Socket namespace에서 해당 room 구독자에게 `subtitle.created`로 emit된다.

Socket client는 `/meeting` namespace에 연결한 뒤 아래 이벤트로 room을 구독한다.

```text
emit "meeting.room.subscribe" with { "roomName": "lab-likelion-20260815-test" }
receive "meeting.room.subscribed"
receive "subtitle.created" when mock subtitles are posted for that room
emit "meeting.room.unsubscribe" with { "roomName": "lab-likelion-20260815-test" }
receive "meeting.room.unsubscribed"
```

room별 mock subtitle buffer를 확인하려면 아래 endpoint를 호출한다. 같은 `subtitleId`의 payload가 여러 번 들어오면 더 높은 `revision`만 최신 목록에 남는다.

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:4000/meeting/rooms/lab-likelion-20260815-test/subtitles"
```

LiveKit `room_finished` webhook을 처리하면 해당 room의 mock subtitle buffer는 비워진다.

## LiveKit webhook

### Local signed smoke

서버를 실행한 터미널은 그대로 두고, 다른 터미널에서 smoke 명령을 실행한다.

```bash
pnpm dev:server
pnpm smoke:livekit-webhook
```

`smoke:livekit-webhook`은 LiveKit webhook과 같은 방식으로 body hash를 서명해 `POST /meeting/livekit/webhook`으로 보낸다. 첫 응답은 `duplicate: false`, 같은 event ID를 다시 보낸 두 번째 응답은 `duplicate: true`여야 한다. 이후 `GET /meeting/rooms/:roomName/state`를 호출해 webhook이 반영한 참가자 snapshot도 확인한다.

서버로 보내지 않고 요청 모양만 확인하려면 아래처럼 실행한다. Authorization 값은 출력하지 않는다.

```bash
pnpm smoke:livekit-webhook -- --dry-run
```

실제 LiveKit Cloud console에서 테스트하려면 서버가 외부에서 접근 가능한 HTTPS URL을 가져야 한다. 그 URL의 `/meeting/livekit/webhook`을 webhook target으로 등록한 뒤 room 입장/퇴장 이벤트가 들어오는지 확인한다.

LiveKit Cloud console에서 webhook target URL은 서버 공개 주소의 아래 endpoint로 설정한다.

```text
POST /meeting/livekit/webhook
Content-Type: application/webhook+json
Authorization: <LiveKit webhook token>
```

서버는 raw body를 보존한 뒤 LiveKit SDK로 signature와 body hash를 검증한다. P0에서는 검증된 event를 인메모리 room state snapshot에 반영하고 ACK한다. 같은 LiveKit event ID가 다시 도착하면 room state를 반복 적용하지 않고 duplicate ACK로 처리한다. DB 저장, transcript 연결, AI Agent handoff는 후속 작업에서 붙인다.

room state를 직접 확인할 때는 smoke 출력의 room 이름으로 아래 endpoint를 호출한다.

```text
GET /meeting/rooms/:roomName/state
```

Cloud webhook target을 등록하기 전에 tunnel 또는 배포 URL로 같은 smoke를 먼저 실행한다.

```powershell
$env:LIVEKIT_WEBHOOK_SMOKE_URL = "https://your-public-host.example/meeting/livekit/webhook"
pnpm smoke:livekit-webhook
```

`LIVEKIT_WEBHOOK_SMOKE_URL`은 localhost가 아니면 `https://`만 허용한다. local smoke는 기본값 `http://localhost:4000/meeting/livekit/webhook`을 사용한다.

### LiveKit Cloud room lifecycle smoke

LiveKit Cloud console에 webhook target을 등록한 뒤에는 실제 Cloud room event가 server room state에 반영되는지 확인한다. 서버와 tunnel을 켜둔 상태에서 실행해야 하며, 이 smoke는 LiveKit Cloud에 테스트 room을 만들고 삭제한다. 참가자나 media track은 만들지 않는다.

```bash
pnpm smoke:livekit-room -- --dry-run
pnpm smoke:livekit-room
```

성공하면 `room_started` 응답은 `status: "active"`, `room_finished` 응답은 `status: "finished"`를 포함한다. 기본 room state 조회 주소는 `http://localhost:4000`이며, 서버를 다른 주소에서 확인해야 하면 아래처럼 바꾼다.

```powershell
$env:LIVEKIT_ROOM_SMOKE_SERVER_BASE_URL = "https://your-public-host.example"
pnpm smoke:livekit-room
```
