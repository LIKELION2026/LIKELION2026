# Virtual Office Contracts

> 상태: 구현 전 초안
>
> 기준: 실제 타입은 `packages/shared`에 정의한다. 이 문서는 구현 책임과 이벤트 의미를 설명한다.

## 공통 상태

```ts
type PresenceStatus = "working" | "meeting" | "away" | "focused";
type AvatarDirection = "up" | "down" | "left" | "right";
type AvatarAnimation = "idle" | "walk";

interface OfficePresence {
  memberId: string;
  displayName: string;
  avatarId: string;
  officeId: string;
  x: number;
  y: number;
  direction: AvatarDirection;
  animation: AvatarAnimation;
  status: PresenceStatus;
  isMicOn: boolean;
  isCameraOn: boolean;
}
```

`memberId`는 인증된 사용자 식별자다. Client가 임의의 다른 사용자 식별자 또는 `officeId`를 지정해 상태를 변경할 수 없다.

## Socket 이벤트

### Client -> Server

| 이벤트 | 입력 | Server 책임 |
| --- | --- | --- |
| `office:join` | `{ officeId }` | 팀 소속 확인, Socket 룸 참여, 스냅샷 반환 |
| `presence:move` | `{ x, y, direction, animation }` | 범위·빈도 검증 후 현재 오피스에 중계 |
| `presence:status:set` | `{ status }` | 허용 상태 검증 후 현재 오피스에 중계 |
| `presence:media:set` | `{ isMicOn, isCameraOn }` | 회의 UI 상태를 현재 오피스에 중계 |

### Server -> Client

| 이벤트 | 출력 | 수신 시 Client 동작 |
| --- | --- | --- |
| `presence:snapshot` | `{ self, members }` | 입장 직후 Store를 현재 상태로 교체 |
| `presence:joined` | `{ member }` | 원격 아바타 생성 대상 추가 |
| `presence:moved` | `{ memberId, x, y, direction, animation }` | 원격 아바타 목표 좌표 갱신 |
| `presence:updated` | `{ memberId, status, isMicOn, isCameraOn }` | 이름표·상태 UI 갱신 |
| `presence:left` | `{ memberId }` | 원격 아바타와 상태 제거 |

`presence:move`는 모든 프레임에 보내지 않는다. 실제 이동 또는 방향·애니메이션 변경이 있을 때만 보내며 Client에서 최대 초당 10~15회로 제한한다.

## 회의실 상호작용

```ts
interface MeetingRoomInteraction {
  kind: "meeting-room";
  zoneId: string;
  meetingRoomId: string;
  label: string;
}
```

1. Phaser의 `InteractionZoneManager`가 Tiled Object Layer에서 `meeting-room` 영역을 감지한다.
2. Scene은 `meeting:interaction:entered` 로컬 이벤트를 발행한다.
3. React `MeetingOverlay`가 회의 이름과 참여 버튼을 표시한다.
4. 사용자가 참여를 명시적으로 선택한 뒤에만 Realtime Meeting이 토큰 API를 요청한다.

Phaser가 LiveKit 토큰을 요청하거나 LiveKit Room을 생성하지 않는다.

## Token API 의존성

```http
POST /meetings/:meetingRoomId/token
```

Server는 요청 사용자의 인증 정보와 팀 소속을 확인하고, 허용된 `meetingRoomId`에 한해 짧은 TTL의 LiveKit 토큰을 반환한다. API Key와 API Secret은 어떤 Client 요청·응답·로그에도 포함하지 않는다.

## 오류와 복구

| 상황 | Client 처리 | Server 처리 |
| --- | --- | --- |
| Socket 재접속 | 마지막 Store를 신뢰하지 않고 `office:join` 재요청 | 최신 스냅샷 반환 |
| 잘못된 좌표 | 마지막 정상 좌표 유지 | 맵 범위·이동 빈도 검증 후 무시 또는 보정 |
| 미허가 회의실 | 참여 UI에 오류 표시 | 토큰 발급 거절 |
| 회의 종료 | Media 상태를 false로 갱신, Phaser 입력 복구 | 별도 Presence 정리 불필요 |
