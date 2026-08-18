# Office Summon Design

> 관련 Issue: [#98](https://github.com/LIKELION2026/LIKELION2026/issues/98)
>
> 작성일: 2026-08-17

## 목표

피플 목록에서 팀원의 현재 위치로 이동하거나, 팀원에게 내 위치로 와 달라는 요청을 보내고 상대가 수락했을 때만 아바타를 이동시킨다.

## 사용자 흐름

### 찾아가기

1. 사용자가 피플 목록에서 연결된 팀원을 선택한다.
2. `찾아가기`를 누른다.
3. 사용자의 아바타가 대상 팀원의 현재 avatar 좌표로 즉시 이동한다.
4. Client는 기존 `presence.move`로 새 좌표를 Server와 다른 팀원에게 전파한다.

### 불러오기

1. 요청자가 연결된 팀원을 선택하고 `불러오기`를 누른다.
2. Server는 같은 workspace에 연결된 대상 Socket에 요청 ID와 요청자 이름을 전달한다.
3. 대상은 `민지가 당신을 불러오기를 원합니다.` 모달에서 `거절` 또는 `이동하기`를 선택한다.
4. 대상이 `이동하기`를 누르면 Server가 요청자의 **수락 시점 최신 위치**를 대상에게 전달한다.
5. 대상 Client는 받은 좌표로 아바타를 이동하고 기존 `presence.move`로 위치를 전파한다.
6. 대상이 `거절`하거나 30초 동안 응답하지 않으면 대상 위치는 바뀌지 않는다.

## Socket 계약

| 이벤트 | 발신 | 수신 | 최소 payload |
| --- | --- | --- | --- |
| `office.summon.request` | 요청 Client | Server | `targetMemberId` |
| `office.summon.requested` | Server | 대상 Client | `requestId`, `requesterMemberId`, `requesterName`, `teamId`, `expiresAt` |
| `office.summon.respond` | 대상 Client | Server | `requestId`, `decision` |
| `office.summon.resolved` | Server | 요청자와 대상 Client | `requestId`, `decision`, `targetPosition?`, `teamId` |

`targetPosition`은 수락일 때만 포함한다. 이동 전송의 진실 원천은 기존 `presence.move`이며, 호출 이벤트는 동의와 대상 좌표 전달만 담당한다.

## 권한과 예외

- 요청자와 대상은 같은 `teamId` Socket room에 연결돼 있어야 한다.
- Server는 Socket 연결의 member ID를 기준으로 요청자와 응답자를 검증한다.
- 요청자는 자기 자신에게 호출 요청을 보낼 수 없다.
- 대상이 연결 해제됐거나 요청이 만료되면 Server는 `declined` 결과로 종료한다.
- 한 대상에게 동시에 열린 요청은 하나만 허용한다.
- 모달이 열린 동안 수락·거절 외에 위치는 변경되지 않는다.

## UI 범위

- 피플 패널의 `찾아가기`, `불러오기` 버튼
- 대상 화면의 호출 요청 모달
- 요청자 화면의 수락·거절·만료 결과 문구
- 메시지 전송, 자동 이동 애니메이션, 반복 요청 차단 UI는 이번 범위에서 제외한다.

## 검증 기준

1. 찾아가기 후 요청자 아바타가 대상 좌표로 이동하고 다른 Browser에도 반영된다.
2. 대상만 호출 모달을 받고, 수락 전에는 이동하지 않는다.
3. 수락 시 대상이 요청자의 최신 좌표로 이동한다.
4. 거절·만료·연결 해제 시 어떤 아바타도 이동하지 않는다.
5. 다른 workspace의 Socket은 호출 이벤트를 받지 않는다.
