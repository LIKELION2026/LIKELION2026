# Public TODO Contract

> 관련 Issue: #48

사용자가 직접 작성한 TODO만 저장·공유한다. 작업 화면이나 활동량은 수집하지 않는다.

| API | 권한 | 결과 |
| --- | --- | --- |
| `POST /office/members/:memberId/todos` | 본인 guest token | TODO 생성 |
| `GET /office/members/:memberId/todos` | 본인 guest token | 공개·비공개 전체 조회 |
| `PATCH /office/todos/:todoId` | 소유자 guest token | 제목·상태·공개 범위 수정 |
| `GET /office/workspaces/:workspaceId/todos` | workspace 조회 | 공개 TODO만 조회 |

`blocked` 상태는 업무 지연의 원인을 추궁하는 신호가 아니라, 도움이나 일정 조정이 필요함을 알리는 협업 신호다.
