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

## 화면 연결

오피스 HUD의 `협업 보드`를 선택하면 오피스 위에 단일 대형 모달을 연다. 모달은 두 영역으로 구성한다.

- 왼쪽 개인 영역: 내 이름, 현재 유효한 공유 일정 상태, 내가 작성한 TODO
- 오른쪽 팀 영역: 주간 공유 캘린더, 선택한 날짜의 일정 목록, 내 일정 추가·삭제

달력은 일요일 시작 6주(42일) 월간 격자로 표시한다. 칸과 일정 상세 목록에는 모두 `작성자 이름 · 상태`를 표시한다. 팀원은 제목을 열어보지 않아도 누가 휴가·재택·회의·집중 상태인지 빠르게 확인할 수 있다.

`useOfficeCalendar`는 `events`, `memberStatuses`, `isLoading`, `error`와 생성·수정·삭제 행동을 제공한다. 캘린더에는 일정의 시작일만이 아니라 일정 기간과 겹치는 모든 날짜에 표시한다. 따라서 휴가처럼 여러 날을 차지하는 일정도 팀원이 월간 맥락에서 확인할 수 있다.

일정이 생성·수정·삭제되면 서버는 같은 workspace의 Socket room에 `office.calendar.updated`를 broadcast한다. 모든 접속자는 현재 보고 있는 월 범위를 다시 조회하므로 새로고침 없이 같은 상태를 확인한다.

## 제외 범위

- 외부 캘린더 동기화, 반복 일정, 알림, 초대·승인
- 다른 사람의 일정 생성·수정
- AI가 일정이나 근무 상태를 자동 추론하는 기능
