import { useState } from "react";
import type { FormEvent } from "react";
import type { TodoStatus } from "@likelion2026/shared";

import type { OfficeTodoController } from "../model/use-office-todos";

interface OfficeTodoPanelProps {
  controller: OfficeTodoController;
  isOpen: boolean;
  onClose: () => void;
}

const TODO_STATUS_LABELS: Record<TodoStatus, string> = {
  blocked: "도움 필요",
  done: "완료",
  in_progress: "진행 중",
  planned: "예정"
};

const TODO_STATUSES: TodoStatus[] = ["planned", "in_progress", "done", "blocked"];

export function OfficeTodoPanel({
  controller,
  isOpen,
  onClose
}: OfficeTodoPanelProps): React.JSX.Element | null {
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [writeError, setWriteError] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const submitTodo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle) {
      return;
    }

    setIsSubmitting(true);
    setWriteError(null);
    try {
      await controller.createTodo({ isPublic, title: nextTitle });
      setTitle("");
      setIsPublic(true);
    } catch (error) {
      setWriteError(error instanceof Error ? error.message : "TODO를 저장하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateTodo = async (
    todoId: string,
    input: { isPublic?: boolean; status?: TodoStatus }
  ) => {
    setIsSubmitting(true);
    setWriteError(null);
    try {
      await controller.updateTodo(todoId, input);
    } catch (error) {
      setWriteError(error instanceof Error ? error.message : "TODO를 수정하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <aside aria-label="내 업무" className="office-todo-panel">
      <div className="office-people-panel-header">
        <div>
          <p className="office-panel-eyebrow">MY WORK</p>
          <h2>오늘의 TODO</h2>
        </div>
        <button aria-label="내 업무 닫기" className="office-icon-button" onClick={onClose} type="button">
          ×
        </button>
      </div>
      <form className="office-todo-form" onSubmit={submitTodo}>
        <label htmlFor="office-todo-title">오늘 진행할 업무</label>
        <input
          disabled={isSubmitting}
          id="office-todo-title"
          maxLength={160}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="예: 회의 번역 자막 UI 연결"
          required
          value={title}
        />
        <label className="office-todo-public-control" htmlFor="office-todo-public">
          <input
            checked={isPublic}
            disabled={isSubmitting}
            id="office-todo-public"
            onChange={(event) => setIsPublic(event.target.checked)}
            type="checkbox"
          />
          팀에 공개하기
        </label>
        <button className="attendance-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "저장 중" : "TODO 추가"}
        </button>
      </form>
      {writeError || controller.error ? (
        <p className="office-panel-error">{writeError ?? controller.error}</p>
      ) : null}
      <section aria-label="내 TODO 목록" className="office-todo-list">
        <p className="office-member-todos-title">내 업무</p>
        {controller.isLoading ? <p className="office-panel-message">TODO 정보를 불러오는 중입니다.</p> : null}
        {!controller.isLoading && controller.ownTodos.length === 0 ? (
          <p className="office-panel-message">아직 작성한 TODO가 없습니다.</p>
        ) : null}
        <ul>
          {controller.ownTodos.map((todo) => (
            <li key={todo.id}>
              <p>{todo.title}</p>
              <div className="office-todo-controls">
                <select
                  aria-label={`${todo.title} 상태`}
                  disabled={isSubmitting}
                  onChange={(event) =>
                    void updateTodo(todo.id, { status: event.target.value as TodoStatus })
                  }
                  value={todo.status}
                >
                  {TODO_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {TODO_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
                <label className="office-todo-public-control" htmlFor={`office-todo-public-${todo.id}`}>
                  <input
                    checked={todo.isPublic}
                    disabled={isSubmitting}
                    id={`office-todo-public-${todo.id}`}
                    onChange={(event) => void updateTodo(todo.id, { isPublic: event.target.checked })}
                    type="checkbox"
                  />
                  공개
                </label>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
