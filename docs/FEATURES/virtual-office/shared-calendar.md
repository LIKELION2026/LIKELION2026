# Shared Calendar P0

> 관련 Issue: #58

공유 캘린더는 팀원의 화면·활동량을 보지 않고도 휴가, 재택, 회의 같은 협업 공백을 미리 조정하기 위한 기능이다.

## API

| API | 권한 | 역할 |
| --- | --- | --- |
| `POST /office/members/:memberId/calendar-events` | 본인 guest token | 내 일정 생성과 본인 참가자 등록 |
| `GET /office/workspaces/:workspaceId/calendar-events` | workspace 조회 | 기간이 겹치는 공유 일정 조회 |
| `GET /office/workspaces/:workspaceId/calendar-statuses` | workspace 조회 | 특정 시각의 파생 협업 상태 조회 |
| `PATCH /office/calendar-events/:eventId` | 생성자 guest token | 내 일정 수정 |
| `DELETE /office/calendar-events/:eventId` | 생성자 guest token | 내 일정 삭제 |

## 상태 우선순위

동일 멤버에게 여러 일정이 유효하면 아래 우선순위를 사용한다.

`휴가 > 부재 > 회의 > 집중 > 재택`

캘린더 상태는 `member_presence`를 영구 변경하지 않는다. Client는 현재 캘린더 상태가 있을 때만 Presence 표시보다 우선해 아바타·People UI에 적용한다. 일정이 끝나면 기존 Presence 표현으로 돌아간다.

## 디자인 연결

`useOfficeCalendar`는 `events`, `memberStatuses`, `isLoading`, `error`와 생성·수정·삭제 행동을 제공한다. `OfficeCalendarPanelSlot`은 기본 화면을 렌더링하지 않으므로, Figma 캘린더 패널이 준비되면 render function으로 연결한다.

## 제외 범위

- 외부 캘린더 동기화, 반복 일정, 알림, 초대·승인
- 다른 사람의 일정 생성·수정
- AI가 일정이나 근무 상태를 자동 추론하는 기능
