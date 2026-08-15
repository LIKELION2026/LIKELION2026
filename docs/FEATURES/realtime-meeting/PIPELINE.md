# Realtime Meeting Pipeline

> 작성자: Codex
>
> 작성일: 2026-08-15
>
> 마지막 업데이트: 2026-08-15
>
> 상태: P0 설계
>
> 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/6

## 목적

LiveKit Cloud 기반 회의 입장, 영상·음성 송수신, 자막 Mock 표시까지의 P0 파이프라인을 정의한다. 실제 STT, Translation Agent, Meeting AI Agent는 후속 단계에서 붙이며, 이 문서는 그 전까지 Client, Server, Shared, LiveKit Cloud가 맡는 책임과 검증 기준을 고정한다.

## 범위

### P0 포함

- LiveKit Cloud 프로젝트를 사용한 1:1 또는 소규모 회의방 입장
- Server의 짧은 TTL LiveKit room join token 발급
- Client Meeting Lab의 기기 사전 확인, 입장, 퇴장, mic/camera 제어
- 원격 참가자 audio/video track 렌더링
- `subtitle.created` Mock 이벤트를 통한 원문·번역 자막 UI 검증
- 권한 거부, 연결 실패, 재연결, 회의 종료 상태 처리

### P0 제외

- 실제 STT/ASR provider 연결
- Translation Agent의 LiveKit room 참가
- LLM 기반 문맥 보정 번역
- Meeting AI의 action item, decision, assignee, deadline 추출
- 녹화 원본, 장기 transcript 저장, 자동 업무 배정

## 한눈에 보는 흐름

```mermaid
sequenceDiagram
    participant User as 사용자
    participant Client as Client Meeting Lab
    participant Server as NestJS Meeting API
    participant LiveKit as LiveKit Cloud Room
    participant SubtitleMock as Subtitle Mock Source

    User->>Client: 이름, 언어, 테스트 룸 선택
    Client->>Client: camera/mic 권한과 장치 확인
    Client->>Server: POST /meeting/token
    Server->>Server: 사용자, 팀, 룸, 권한 검증
    Server-->>Client: serverUrl, token, expiresAt 반환
    Client->>LiveKit: token으로 room connect
    Client->>LiveKit: camera/mic track publish
    LiveKit-->>Client: participant, track, reconnect 이벤트
    SubtitleMock-->>Client: subtitle.created Mock 이벤트
    Client->>Client: 원문, 번역문, 발화자, isFinal 표시
    User->>Client: 회의 종료
    Client->>LiveKit: track stop, room disconnect
```

## 책임 경계

| 영역 | 책임 |
| --- | --- |
| Client | 기기 권한 확인, LiveKit room 연결, local/remote media 렌더링, 회의 상태 UI, 자막 Mock 표시 |
| Server | 인증된 사용자 확인, 룸 접근 권한 검증, LiveKit token 발급, API secret 보관 |
| Shared | `CreateMeetingTokenRequest`, `CreateMeetingTokenResponse`, `subtitle.created` payload 계약 |
| LiveKit Cloud | WebRTC signaling, SFU media routing, reconnect, 참가자·track 이벤트 전달 |
| Subtitle Mock Source | 실제 STT 전까지 자막 UI와 Socket/TextStream 계약을 검증하는 개발용 입력 |

## 상세 파이프라인

### 1. 입장 전 기기 확인

Client는 사용자가 회의에 들어가기 전에 camera/mic 권한과 장치 목록을 확인한다. 권한이 거부되면 회의 입장 버튼을 막거나, audio-only 입장처럼 허용 가능한 대체 경로를 명확히 표시한다.

확인할 상태:

- `idle`: 아직 권한 확인 전
- `checking`: 장치와 권한 확인 중
- `ready`: 입장 가능
- `permission-denied`: 권한 거부
- `device-unavailable`: 사용 가능한 장치 없음

### 2. 토큰 발급

Client는 LiveKit API key나 secret을 직접 알지 않는다. 회의 입장 시 Server의 `POST /meeting/token`만 호출한다.

요청에 포함할 값:

- `roomName`
- `participantName`
- `participantIdentity`
- `preferredLanguage`

Server에서 검증할 값:

- P0에서는 인증 모듈이 붙기 전이므로 `lab-<team>-<yyyymmdd>-<slug>` 형식의 Meeting Lab room만 허용한다.
- `participantIdentity`가 없으면 `guest-<uuid>`를 발급한다. 값이 있으면 영문, 숫자, `-`, `_`만 허용한다.
- `participantName`, `participantIdentity`, `roomName`은 앞뒤 공백을 제거한 뒤 검증한다.
- LiveKit grant는 room join, subscribe, camera/microphone publish, data publish만 허용한다.

응답에 포함할 값:

- `serverUrl`
- `token`
- `roomName`
- `participantIdentity`
- `participantName`
- `expiresAt`

보안 원칙:

- `LIVEKIT_API_SECRET`은 Server 환경변수로만 읽는다.
- token TTL은 짧게 유지한다. 현재 기본값은 900초를 사용한다.
- token, API key, API secret은 로그에 남기지 않는다.
- Client에는 LiveKit Cloud 접속 URL과 join token만 전달한다.
- `LIVEKIT_URL`은 `wss://`로 시작하는 LiveKit Cloud URL만 허용한다.

### 3. LiveKit room 연결

Client는 Server 응답의 `serverUrl`과 `token`으로 LiveKit room에 연결한다. 첫 참가자가 입장할 때 room이 자동 생성될 수 있으므로 P0에서는 별도 room create API를 강제하지 않는다.

Client가 처리할 이벤트:

- 연결 중
- 연결 완료
- 재연결 중
- 재연결 완료
- 연결 실패
- 참가자 입장·퇴장
- local/remote track publish·unpublish
- 회의 종료

회의 종료 시 처리:

- local camera/mic track stop
- room disconnect
- 화면 상태 초기화
- 남은 listener와 timer 정리

### 4. 자막 Mock 흐름

실제 STT/번역 Agent가 붙기 전까지는 자막 Mock 입력으로 화면과 계약을 검증한다. Mock은 실제 번역 품질을 검증하지 않고, 회의 화면이 자막 이벤트를 안정적으로 표시하는지만 확인한다.

사용 계약:

```ts
interface SubtitleCreatedPayload {
  subtitleId: string;
  roomName: string;
  speaker: {
    participantIdentity: string;
    displayName: string;
  };
  sourceLanguage: LanguageCode;
  sourceText: string;
  translatedLanguage: LanguageCode;
  translatedText: string;
  occurredAt: string;
  isFinal: boolean;
  revision: number;
  confidence?: number;
}
```

표시 기준:

- `subtitleId`는 한 발화 세그먼트의 안정적인 ID로 사용한다.
- `isFinal: false`는 임시 자막으로 표시하고, 같은 `subtitleId`의 새 이벤트가 오면 교체한다.
- `isFinal: true`는 확정 자막으로 표시한다.
- `revision`은 같은 `subtitleId` 안에서 1부터 증가한다. Client는 더 낮은 `revision`의 늦게 도착한 이벤트를 무시한다.
- 원문과 번역문을 함께 보여 준다.
- 번역이 확정적이지 않을 수 있음을 자막 UI에서 인지할 수 있게 한다.

### 5. 후속 Agent 연결 지점

후속 단계에서 Translation Agent를 붙이면 `Subtitle Mock Source`가 Agent로 교체된다. Agent는 LiveKit room에 programmatic participant로 참가해 참가자 audio track을 구독하고, STT와 번역 결과를 자막 이벤트로 발행한다.

후속 단계에서 추가할 책임:

- audio track별 STT streaming
- partial transcript와 final transcript 구분
- 빠른 임시 번역과 stable chunk 기반 보정 번역 분리
- final transcript 저장
- Meeting AI 입력용 확정 transcript 전달

P0에서는 이 책임을 구현하지 않는다. 단, `subtitleId`, `revision`, `speaker`, `sourceLanguage`, `translatedLanguage`, `isFinal` 필드는 후속 Agent가 그대로 사용할 수 있게 유지한다. 별도 `segmentId`는 P0에서 추가하지 않고, STT provider 연결 시 provider-native segment id가 필요해지면 확장한다.

## 오류 상태

| 상황 | 사용자에게 보여 줄 상태 | 구현 기준 |
| --- | --- | --- |
| camera/mic 권한 거부 | 권한을 허용해야 회의에 참여할 수 있음 | 브라우저 권한 안내와 재시도 제공 |
| 장치 없음 | 사용할 수 있는 장치 없음 | audio-only 또는 재확인 경로 제공 여부 결정 |
| token API 실패 | 회의 입장 정보를 받을 수 없음 | 4xx/5xx에 따라 권한 문제와 서버 문제를 분리 |
| LiveKit 연결 실패 | 회의방 연결 실패 | 재시도 버튼과 오류 원인 표시 |
| 재연결 중 | 네트워크 재연결 중 | media UI를 유지하고 상태 배지 표시 |
| 자막 Mock 없음 | 아직 자막 없음 | 빈 상태 표시 |
| 회의 종료 | 회의가 종료됨 | track과 listener 정리 후 입장 화면으로 복귀 |

## 구현 체크리스트

### Shared

- `subtitle.created` 이벤트 이름 상수 확정 완료
- `SubtitleCreatedPayload`는 `subtitleId`를 segment grouping key로 사용
- partial/final 갱신은 같은 `subtitleId`와 증가하는 `revision`으로 처리
- `SocketEventPayloadMap`으로 이벤트 이름과 payload 타입 연결
- token request/response 타입을 Client와 Server에서 함께 사용

### Server

- `POST /meeting/token` 인증 연결
- P0 room 정책: `lab-<team>-<yyyymmdd>-<slug>`
- P0 participant identity 정책: 입력값 검증 또는 `guest-<uuid>` 발급
- LiveKit grant 정책: room join, subscribe, camera/microphone publish, data publish
- token TTL과 환경변수 검증 문서화
- token/API secret 로그 마스킹 확인

### Client

- `apps/client` 초기 구조 생성
- Meeting Lab 라우트 추가
- device preflight UI 구현
- LiveKit room 연결과 media 렌더링 구현
- mic/camera toggle 구현
- 연결 상태와 오류 상태 구현
- 자막 Mock 이벤트 표시 구현

### Verification

- 두 브라우저가 같은 `lab-<name>-<date>` 룸에 입장한다.
- local/remote video와 audio가 표시된다.
- mic/camera toggle이 track 상태에 반영된다.
- 권한 거부와 연결 실패가 사용자에게 표시된다.
- `subtitle.created` Mock 이벤트가 원문·번역문·발화자·시각·확정 여부로 표시된다.
- 회의 종료 후 camera/mic 사용이 정리된다.

## 오픈 질문

- 인증이 붙은 뒤 `participantIdentity`를 로그인 사용자 ID로 고정할 것인가, 회의별 alias를 허용할 것인가?
- 자막 Mock은 Client local fixture로 시작할지, Server Socket 이벤트로 발행할지 결정이 필요하다.

## 참고 자료

- [LiveKit Access Tokens and Grants](https://docs.livekit.io/frontends/reference/tokens-grants/)
- [LiveKit Endpoint Token Generation](https://docs.livekit.io/frontends/build/authentication/endpoint/)
- [LiveKit JavaScript Server SDK](https://docs.livekit.io/reference/server-sdk-js/)
- [LiveKit Text Streams](https://docs.livekit.io/transport/data/text-streams/)
