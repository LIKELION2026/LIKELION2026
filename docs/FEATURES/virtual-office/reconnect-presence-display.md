# 재접속 아바타 표시 상태 복구

> 상태: 구현 및 실제 환경 검증 완료
>
> 관련 Issue: [#90](https://github.com/LIKELION2026/LIKELION2026/issues/90)

## 문제

Socket 연결이 성공해도 재접속한 사용자의 Supabase presence가 `connected/ghost`로 남았다. Phaser는 `displayMode=ghost`를 기준으로 아바타를 반투명하게 표시하고 `연결 해제` 라벨을 붙인다.

## 원인

| 경로 | 저장 상태 |
| --- | --- |
| `disconnectRealtimeMember()` | `disconnected/ghost` |
| 기존 `connectRealtimeMember()` | `connected/ghost` |

재접속 경로가 `connection_status`만 바꾸고 `attendance_status`, `display_mode`, 상태 메시지를 복구하지 않았기 때문이다. 실제 Supabase 집계에서 `connected/ghost` 2건을 확인했다.

## 수정

`connectRealtimeMember()`가 오피스 재진입을 자동 출근으로 처리한다.

```text
office.join
  -> working
  -> active
  -> connected
  -> office.snapshot
```

| 필드 | 재접속 후 값 |
| --- | --- |
| `attendance_status` | `working` |
| `display_mode` | `active` |
| `connection_status` | `connected` |
| `checked_in_at` | 재접속 시각 |
| `checked_out_at` / `disconnected_at` | `null` |
| `status_message` | `근무 중` |

사용자가 `퇴근하기`를 누르는 기존 경로는 `checked_out/sleeping`을 유지한다. 실제 Socket 연결 해제만 `disconnected/ghost`로 전환한다.

## 검증

1. OfficeService 단위 테스트: `checked_out/ghost/disconnected` 입력이 재접속 뒤 `working/active/connected`가 되는지 확인했다.
2. 실제 `.env`를 읽는 로컬 Nest 서버와 Supabase에 검증용 guest를 만들었다.
3. Socket.IO `office.join` 뒤 수신한 `office.snapshot`과 Supabase `member_presence`가 모두 `working/active/connected`인지 확인했다.
4. 검증 guest는 종료 후 삭제해 desk를 점유하지 않도록 정리했다.

## 에셋 메모

`gray-cat.webp`가 새로 추가됐으나 현재 Phaser 아바타 로더의 `1536 x 1024`, `6 x 4`, 프레임 `256 x 256` 규격과 다르다. 이번 presence 수정에는 포함하지 않으며, 별도 아바타 에셋 규격 작업에서 적용한다.
