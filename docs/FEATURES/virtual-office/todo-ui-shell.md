# TODO UI Shell

> 관련 Issue: #52
> API 계약: [Public TODO Contract](./public-todos.md)
> 사용자 흐름: [TODO User Scenarios](./todo-user-scenarios.md)

상세 Figma 디자인이 확정되기 전에는 TODO 패널을 임의의 시각 디자인으로 만들지 않는다. 대신 `OfficeTodoPanelSlot`에 아래 controller를 전달해, 디자인 컴포넌트가 데이터 요청 로직 없이 화면만 담당하도록 분리한다.

```ts
interface OfficeTodoController {
  ownTodos: OfficeTodo[];
  publicTodos: PublicOfficeTodo[];
  isLoading: boolean;
  error: string | null;
  refresh(): Promise<void>;
  createTodo(input): Promise<void>;
  updateTodo(todoId, input): Promise<void>;
}
```

## 디자인 적용 연결점

| 화면 | 사용할 데이터 | 가능한 행동 |
| --- | --- | --- |
| 내 프로필 또는 내 데스크 | `ownTodos` | 생성, 제목 수정, 상태 변경, 공개 범위 변경 |
| 타인 프로필 또는 타인 데스크 | `publicTodos`에서 해당 `memberId` 필터 | 읽기 전용 |
| People 목록 | `publicTodos` 요약 | 선택한 팀원의 작업 맥락 표시 |

`OfficeTodoPanelSlot`은 기본적으로 아무 화면도 렌더링하지 않는다. 디자인팀이 만든 패널을 render function으로 전달하는 시점에만 표시한다. 이 방식으로 API·상태·오류 처리는 유지하면서 레이아웃과 자산을 교체할 수 있다.

## 후속 범위

- Phaser 아바타·데스크 클릭 이벤트와 패널 열림 상태 연결
- TODO 변경 Socket 이벤트와 낙관적 갱신
- 확정 Figma 기준의 반응형 패널, 빈 상태, 로딩 상태, 오류 상태 디자인
