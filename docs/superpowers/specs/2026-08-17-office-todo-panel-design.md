# Office Todo Panel Design

> Related Issue: #95

## Goal

사용자가 감시용 활동 신호가 아닌, 자발적으로 공개할 오늘의 업무를 작성하고 상태를 갱신한다.

## Interaction

1. HUD의 `내 TODO`를 선택한다.
2. 제목과 팀 공개 여부를 입력해 TODO를 저장한다.
3. 작성한 TODO에서 상태와 공개 여부를 바꾼다.
4. 저장 후 내 목록과 피플 패널이 사용하는 공개 TODO 목록을 다시 조회한다.

## Boundaries

- 타인은 피플 프로필에서 `isPublic === true`인 TODO만 읽는다.
- TODO 작성자는 본인의 guest token으로만 생성·수정한다.
- 화면·키보드·카메라 활동을 저장하거나 보여주지 않는다.
- 저장 중, 빈 상태, 오류는 서로 다른 문구로 표시한다.

## Avatar Policy

- 신규 게스트는 `office-avatar`만 받는다.
- `gray-cat.webp`는 표준 `1536 x 1024 / 6 x 4 / 256px` 시트가 제공될 때까지 세션 배정을 중단한다.
