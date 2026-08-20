# Realtime Meeting Performance

> 작성자: Codex
>
> 작성일: 2026-08-20
>
> 마지막 업데이트: 2026-08-20
>
> 상태: #135 1차 자동 최적화 및 수동 측정 준비
>
> 관련 Issue / PR / Discussion: https://github.com/LIKELION2026/LIKELION2026/issues/135

## 목적

Phaser 오피스, LiveKit 화상회의, 채팅, 실시간 번역 자막이 한 화면에서 동시에 동작할 때 6명 P0 데모가 끊기지 않도록 성능 예산과 측정 절차를 고정한다.

## P0 측정 시나리오

| 항목 | 기준 |
| --- | --- |
| 참가자 수 | 6명 |
| 카메라 | 6개 ON |
| 발화 | 2명 동시 발화 유지 |
| 유지 시간 | 5분 이상 |
| 화면 | 기본 오피스 화면, 상단 participant strip, 우측 채팅, 하단 control/caption |
| 추가 조작 | 화면 키우기 grid 전환, AI 번역 ON/OFF, 채팅 송수신, 회의실 이탈/재입장 |

## 측정 환경 기록 양식

| 항목 | 값 |
| --- | --- |
| 측정 일시 | 미측정 |
| 측정자 | 미측정 |
| PC / CPU / RAM | 미측정 |
| OS / 브라우저 | Chrome 기준, 실제 버전 미측정 |
| 화면 해상도 | 미측정 |
| 네트워크 | 미측정 |
| Client URL | 미측정 |
| Server URL | 미측정 |
| LiveKit 프로젝트 / 리전 | 미측정 |
| Translation Agent 배포 | 미측정 |

## 성능 예산

| 지표 | P0 예산 | 1차 상태 |
| --- | --- | --- |
| Phaser 평균 FPS | 6명/2명 동시 발화/5분 동안 45 이상 | 수동 측정 필요 |
| LiveKit 연결 시간 | 권한 승인 완료 후 p95 5초 이내 | 수동 측정 필요 |
| 재입장 cleanup | 5회 반복 뒤 media track/listener/task 증가 없음 | 자동 테스트 일부 보강, 수동 측정 필요 |
| 로컬 track 정지 | 퇴장 후 2초 이내 camera/mic track 정지 | 수동 측정 필요 |
| 치명 오류 | reconnect loop, 페이지 멈춤, 번역 worker 누수 0건 | 자동 테스트 일부 보강, 수동 측정 필요 |

## 1차 개선 내역

| 영역 | 기준선 | 개선 후 | 확인 방법 |
| --- | --- | --- | --- |
| LiveKit adaptive stream | `adaptiveStream: false`라 보이지 않는 remote video pause/quality 조정 이득을 받지 못함 | `adaptiveStream: true`, `dynacast: true` 조합으로 복구 | client typecheck |
| 카메라 publish | SDK 기본 h720 profile 사용, 프레임 상한 명시 없음 | camera capture/publish를 720p/15fps로 고정하고 simulcast layer를 h180/h360으로 제한 | `meeting-performance.test.ts` |
| expanded view 렌더 | 상단 strip과 expanded grid가 동시에 렌더될 수 있음 | expanded view에서는 grid만 렌더해 같은 video track의 중복 attach를 줄임 | client typecheck |
| camera/mic OFF participant | publication track이 남아 있으면 media element가 계속 만들어질 수 있음 | muted publication은 media track view model에서 제외하고 placeholder만 렌더 | client typecheck |
| participant tile memo | participant 객체가 새로 만들어지면 shallow memo가 깨짐 | 표시 상태 비교 함수로 실제 표시값이 같으면 tile 재렌더를 건너뜀 | `meeting-participant-render-state.test.ts` |
| 채팅 타임라인 | 화면 보관 상한 5,000개 | 화면 보관 상한 100개 | `meeting-chat-message.test.ts` |
| 자막 payload | subtitle 배열에 상한 없음 | 같은 `subtitleId`는 revision으로 교체하고 최근 100개만 유지 | `meeting-subtitle-buffer.test.ts` |
| Translation Agent detach | audio task cancel 후 완료 대기를 보장하지 않음 | cancel된 task를 await한 뒤 worker를 제거해 source close 완료 시점을 앞당김 | `test_livekit_room.py` |

## 수동 측정 절차

1. Chrome 프로필 6개 또는 참가자 6명이 같은 회의실에 접속한다.
2. DevTools Performance recording을 시작하고 Meeting Room 구역에 들어간다.
3. 구간별 시간을 기록한다.
   - 구역 진입
   - 카메라/마이크 권한 승인
   - `/meeting/token` 응답
   - LiveKit `connected`
   - 첫 원격 영상 표시
4. 5분 동안 6명 카메라 ON, 2명 동시 발화, 채팅 송수신, AI 번역 ON/OFF를 섞어 유지한다.
5. LiveKit stats에서 송수신 bitrate, packet loss, selected layer 변화를 기록한다.
6. DevTools Performance에서 FPS, JS long task, React commit burst를 확인한다.
7. DevTools Memory 또는 Task Manager로 heap 추이를 기록한다.
8. 회의실 이탈/재입장을 5회 반복하고 media track, listener, Socket, translation worker가 증가하지 않는지 확인한다.

## 수동 측정 결과 표

| 측정 항목 | 기준선 | 개선 후 | 판정 | 메모 |
| --- | --- | --- | --- | --- |
| 권한 승인 → LiveKit connected | 미측정 | 미측정 | 보류 | 6인 수동 테스트 필요 |
| connected → 첫 원격 영상 | 미측정 | 미측정 | 보류 | 6인 수동 테스트 필요 |
| 5분 평균 Phaser FPS | 미측정 | 미측정 | 보류 | 6인 수동 테스트 필요 |
| JS long task 최대/횟수 | 미측정 | 미측정 | 보류 | 6인 수동 테스트 필요 |
| heap 증가량 | 미측정 | 미측정 | 보류 | 6인 수동 테스트 필요 |
| 송수신 bitrate / packet loss | 미측정 | 미측정 | 보류 | LiveKit stats 필요 |
| rev1 자막 지연 | 미측정 | 미측정 | 보류 | Translation Agent 배포 상태 필요 |
| final 자막 지연 | 미측정 | 미측정 | 보류 | Translation Agent 배포 상태 필요 |
| 재입장 5회 후 track/listener/task 증가 | 미측정 | 미측정 | 보류 | 수동+로그 확인 필요 |

## 자동 검증

1차 코드 변경에서 실행할 검증:

```bash
node --test --experimental-strip-types \
  apps/client/test/meeting-performance.test.ts \
  apps/client/test/meeting-participant-render-state.test.ts \
  apps/client/test/meeting-subtitle-buffer.test.ts \
  apps/client/test/meeting-chat-message.test.ts

corepack pnpm --filter @likelion2026/client typecheck

uv run --cache-dir .uv-cache --with pytest python -m pytest tests/test_livekit_room.py
```

## 남은 작업

- 6인 Chrome 수동 측정 결과를 위 표에 채운다.
- DevTools Performance/Memory와 LiveKit stats 캡처를 PR 또는 Issue 댓글에 첨부한다.
- 측정값이 P0 예산을 넘으면 원인별 후속 이슈를 분리한다.
