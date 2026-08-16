# 가상 오피스 계약 초안

> 작성자: Project Team
>
> 작성일: 2026-08-16
>
> 마지막 업데이트: 2026-08-16
>
> 관련 Issue / PR / Discussion: Issue #22

## 목적

출퇴근, 재접속, 휴가/재택 상태를 구현할 때 Client, Server, Supabase가 서로 다른 상태값을 만들지 않도록 공통 계약을 정한다. 실제 타입의 기준은 `packages/shared`이며, 이 문서는 그 타입을 사용하는 흐름을 설명한다.

## 상태 계약

| 구분 | 값 | 의미 |
| --- | --- | --- |
| 연결 상태 | `connected`, `disconnected` | Socket이 현재 연결되어 있는지 |
| 출퇴근 상태 | `working`, `checked_out` | 사용자가 출근 또는 퇴근을 명시했는지 |
| 협업 가능 상태 | `available`, `focus`, `meeting`, `vacation`, `remote_work`, `absent` | 연락과 협업 가능 여부 |
| 아바타 표현 | `active`, `sleeping`, `ghost`, `vacation`, `remote` | Phaser가 화면에 그릴 모습 |

상태는 `OfficeCollaborationPresence`로 저장하고, Socket에는 기존 Phaser 표시 타입인 `OfficeMemberPresence`와 함께 `officePresence`로 전달한다. `status`는 HUD용 짧은 상태이며, `officePresence`는 출퇴근·연결·ghost 표현의 기준이다.

## Socket 이벤트 초안

| 이벤트 | 방향 | 용도 |
| --- | --- | --- |
| `office.join` | Client → Server | `memberId`, `guestToken`, `workspaceId`로 소유권을 검증하고 오피스 room에 입장 |
| `office.snapshot` | Server → Client | 같은 workspace의 영속 멤버·상태와 현재 사용자 반환 |
| `office.attendance.update` | Client → Server | 출근 또는 퇴근 의도 전달 |
| `office.attendance.updated` | Server → Room | 출퇴근 변경 전파 |
| `office.heartbeat` | Client → Server | 연결 유지와 마지막 활동 시각 갱신 |
| `office.lifecycle.updated` | Server → Room | 연결·출퇴근·표현 상태를 포함한 영속 상태 변경 전파 |
| `presence.move` | Client → Server | 이동 좌표를 room에 즉시 전파하고 마지막 좌표를 주기적으로 저장 |

Gateway는 입장 시 DB 스냅샷을 제공하고, 이동은 Socket 우선으로 중계한다. 마지막 좌표는 1초 간격과 disconnect 시점에 DB에 저장한다. guest token은 handshake 검증에만 쓰며 다른 클라이언트에 전파하지 않는다.

## 데이터 책임

| 정보 | 기준 저장소 | 실시간 전달 |
| --- | --- | --- |
| 멤버, 아바타, 데스크 | Supabase | 변경 시 Socket 전파 |
| 출퇴근, 휴가·재택, TODO | Supabase | 변경 시 Socket 전파 |
| 이동 중 좌표 | Socket | 이동 종료 또는 주기 시 마지막 좌표만 Supabase 저장 |
| heartbeat와 disconnect | Socket 감지 후 Supabase 반영 | `office.lifecycle.updated` |

## 다음 구현 범위

- 현재 시간에 유효한 캘린더 일정으로 `availabilityStatus`와 `displayMode` 계산
- 클라이언트의 TODO·캘린더 UI
