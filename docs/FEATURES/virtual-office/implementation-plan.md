# Virtual Office Bootstrap Implementation Plan

> 상태: 1차 구현 및 로컬 통합 검증 완료
>
> 대상 브랜치: `dev`
>
> 관련 기능: Virtual Office, Realtime Meeting

## 목표

디자인 에셋이 없는 상태에서도 두 사용자가 같은 2D 오피스에 접속해 이동·상태를 확인할 수 있는 기반을 만든다. 회의 담당자는 같은 Client의 `meeting-lab` 경로에서 기존 LiveKit 토큰 API를 연결해 테스트할 수 있어야 한다.

## 기존 기반

- `apps/server`: NestJS와 `POST /meeting/token` LiveKit 토큰 API가 존재한다.
- `packages/shared`: 회의·자막·기본 Presence 타입이 존재한다.
- `apps/client`: 새로 생성한다.
- 실제 오피스 타일셋과 아바타 에셋은 아직 없다.

## 이번 PR 범위

### 포함

1. React + Vite + TypeScript Client 초기 설정
2. `/office`, `/meeting-lab` 진입 경로
3. Socket.IO 기반 Presence 계약과 NestJS Gateway
4. 임시 도형 기반 Phaser 오피스와 로컬·원격 아바타
5. 상태 변경과 회의실 진입 안내 UI
6. Client에서 기존 `/meeting/token` API를 호출할 수 있는 경계

### 제외

- LiveKit 영상·음성 UI와 번역 자막 구현
- 실제 인증, 데이터베이스, 영속 상태
- Tiled 맵과 디자인 에셋 적용
- AI 상태 제안과 브리핑

## 작업 순서

| 단계 | 책임 | 완료 기준 |
| --- | --- | --- |
| 1. Client Bootstrap | FE | `pnpm dev:client`로 Client가 실행되고 두 진입 경로를 볼 수 있다. |
| 2. Shared 계약 | 공통 | 위치·방향·상태·입장·퇴장 이벤트가 `packages/shared`에 정의된다. |
| 3. Presence Gateway | BE | 두 브라우저가 같은 팀 룸에서 스냅샷·입장·퇴장·이동·상태를 주고받는다. |
| 4. 임시 오피스 | Virtual Office FE | 도형 기반 벽·책상·회의실과 키보드 이동·충돌이 동작한다. |
| 5. Client 동기화 | Virtual Office FE | 원격 아바타가 `memberId` 기준으로 보이고 부드럽게 이동한다. |
| 6. Meeting 연결점 | FE + Meeting 담당 | 회의실 참여 안내에서 기존 토큰 API 호출을 검증할 수 있다. |

## 구현 및 검증 결과

- `apps/client`에 React + Vite 기반 Client와 `/office`, `/meeting-lab` 경로를 구성했다.
- `apps/server/src/modules/presence`에 `/office` Socket.IO Gateway를 추가했다.
- 두 개발용 사용자의 입장, 퇴장, 위치 이동, 상태 변경이 같은 팀 룸 안에서 중계되는 것을 확인했다.
- 임시 도형 기반 Phaser Scene에 경계·장애물 충돌, 로컬 이동, 원격 위치 보간, 회의실 진입 안내를 적용했다.
- 기존 `POST /meeting/token` 호출을 Meeting Lab에서 검증할 수 있도록 API 경계를 연결했다.
- 실제 영상·음성·번역 자막 화면은 Realtime Meeting 담당 영역으로 남긴다.

## 소유 경계

| 영역 | 담당 | 이번 작업의 책임 |
| --- | --- | --- |
| `features/virtual-office` | Virtual Office 담당 | Phaser Scene, 이동, 원격 아바타, 상태 표시, 회의실 진입 |
| `modules/presence` | Virtual Office 담당 | Socket 접속과 오피스 상태 중계 |
| `features/realtime-meeting` | LiveKit 담당 | 영상·음성, 기기 권한, 번역 자막 |
| `modules/meeting` | LiveKit 담당 | 토큰 발급 API 유지·고도화 |
| `packages/shared` | 공동 검토 | 변경 전 담당자 간 이벤트·payload 합의 |

## 개발용 사용자와 데이터

초기에는 인증과 DB를 기다리지 않는다.

- 팀 ID: `demo-global-team`
- 사용자 ID: 브라우저 세션마다 생성하거나 URL query로 지정
- 표시 이름: URL의 `name` query 또는 개발용 기본값
- 상태 저장: Server 메모리

실제 인증 도입 시 handshake와 API 요청에서 개발용 식별값을 인증 사용자 정보로 교체한다.

## 검증 시나리오

1. `http://localhost:5173/office?name=Korea-PM` 접속
2. 다른 브라우저에서 `http://localhost:5173/office?name=Vietnam-Dev` 접속
3. 두 아바타의 입장·퇴장·이동·상태 변경 확인
4. 한 사용자가 회의실 영역에 들어가 참여 안내 확인
5. `meeting-lab`에서 `POST /meeting/token` 성공·실패 상태 확인

## 다음 PR

- 디자인 에셋을 Tiled 맵과 Sprite Sheet로 교체
- LiveKit 회의 컴포넌트와 회의실 참여 흐름 연결
- 자막·번역 이벤트와 회의 상태를 오피스 UI에 반영
