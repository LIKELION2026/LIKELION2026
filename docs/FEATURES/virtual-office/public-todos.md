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

## 실시간 갱신

TODO를 생성하거나 수정한 뒤 API Server는 같은 workspace의 `office:<workspaceId>` Socket room으로 `office.todos.updated` 이벤트를 발행한다.

- payload: 변경한 `memberId`, `teamId`, `occurredAt`
- 작성한 Client: 기존 API 저장 뒤 자신의 TODO와 공개 TODO를 다시 조회한다.
- 다른 Client: 이벤트를 받으면 공개 TODO를 다시 조회해 People 목록의 읽기 전용 TODO를 갱신한다.
- 이벤트에는 TODO 본문을 포함하지 않는다. 공개 범위 변경 직후에도 API 조회 결과만 표시해 비공개 항목이 Socket payload로 노출되지 않게 한다.
