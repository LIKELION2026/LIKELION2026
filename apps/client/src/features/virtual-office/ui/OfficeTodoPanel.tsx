import { useState } from "react";
import type { FormEvent } from "react";
import type { AttendanceStatus, MemberStatus, TodoStatus } from "@likelion2026/shared";

import type { OfficeTodoController } from "../model/use-office-todos";
import { RequestSpinner, useRequestFeedback } from "../../../app/request-feedback";
import { AvatarFace } from "./AvatarFace";

interface OfficeTodoPanelProps {
  avatarId: string | undefined;
  controller: OfficeTodoController;
  isOpen: boolean;
  onAttendanceChange: (attendanceStatus: AttendanceStatus) => void;
  onClose: () => void;
  onStatusChange: (status: MemberStatus) => void;
  selfAttendanceStatus: AttendanceStatus | undefined;
  selfStatus: MemberStatus | undefined;
}

const TODO_STATUS_LABELS: Record<TodoStatus, string> = {
  blocked: "도움 필요",
  done: "완료",
  in_progress: "진행 중",
  planned: "예정"
};

const TODO_STATUSES: TodoStatus[] = ["planned", "in_progress", "done", "blocked"];

const ASSET_PATH = "/assets/status-todo";
type Workplace = "home" | "office";
type StatusChoice = Workplace | "away" | "leave";

export function OfficeTodoPanel({
  avatarId,
  controller,
  isOpen,
  onAttendanceChange,
  onClose,
  onStatusChange,
  selfAttendanceStatus,
  selfStatus
}: OfficeTodoPanelProps): React.JSX.Element | null {
  const { showError, showSuccess } = useRequestFeedback();
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [writeError, setWriteError] = useState<string | null>(null);
  const [workplace, setWorkplace] = useState<Workplace | null>(null);
  const [draftChoice, setDraftChoice] = useState<StatusChoice | null>(null);

  if (!isOpen) {
    return null;
  }

  const committedChoice: StatusChoice | null =
    selfAttendanceStatus === "checked_out"
      ? "leave"
      : selfAttendanceStatus === "working" && selfStatus === "away"
        ? "away"
        : selfAttendanceStatus === "working"
          ? workplace
          : selfStatus === "away"
            ? "away"
            : null;
  const activeChoice = draftChoice ?? committedChoice;
  const hasPendingStatusChange = draftChoice !== null && draftChoice !== committedChoice;

  const chooseStatus = (choice: StatusChoice) => {
    setDraftChoice(choice);
  };

  const submitTodo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (hasPendingStatusChange && draftChoice) {
      if (draftChoice === "home" || draftChoice === "office") {
        setWorkplace(draftChoice);
        onAttendanceChange("working");
        if (selfStatus === "away") {
          onStatusChange("available");
        }
      } else if (draftChoice === "away") {
        onStatusChange("away");
        if (selfAttendanceStatus === "checked_out") {
          onAttendanceChange("working");
        }
      } else {
        setWorkplace(null);
        onAttendanceChange("checked_out");
        if (selfStatus === "away") {
          onStatusChange("available");
        }
      }
    }

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
      showSuccess("TODO를 저장했습니다.");
    } catch (error) {
      setWriteError("TODO를 저장하지 못했습니다. 다시 시도해 주세요.");
      showError(error, "TODO를 저장하지 못했습니다. 다시 시도해 주세요.");
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
      showSuccess("TODO를 업데이트했습니다.");
    } catch (error) {
      setWriteError("TODO를 수정하지 못했습니다. 다시 시도해 주세요.");
      showError(error, "TODO를 수정하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteTodo = async (todoId: string) => {
    setIsSubmitting(true);
    setWriteError(null);
    try {
      await controller.deleteTodo(todoId);
      showSuccess("TODO를 삭제했습니다.");
    } catch (error) {
      setWriteError("TODO를 삭제하지 못했습니다. 다시 시도해 주세요.");
      showError(error, "TODO를 삭제하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <aside aria-label="상태 변경 및 내 업무" className="std-panel">
      <header className="std-header">
        <img alt="상태변경 / 투두" className="std-title-img" src={`${ASSET_PATH}/panel-title.png`} />
        <div className="std-header-actions">
          <button
            className="std-save-button"
            disabled={isSubmitting || (!hasPendingStatusChange && !title.trim())}
            form="std-todo-form"
            type="submit"
          >
            <img alt="저장" src={`${ASSET_PATH}/save-button.png`} />
          </button>
          <button aria-label="닫기" className="office-icon-button" onClick={onClose} type="button">
            ×
          </button>
        </div>
      </header>

      <div className="std-body">
        <div className="std-avatar-card">
          <div className="std-avatar-frame">
            <img alt="" aria-hidden="true" className="std-avatar-frame-bg" src={`${ASSET_PATH}/avatar-circle.png`} />
            <AvatarFace avatarId={avatarId} size={120} />
          </div>
        </div>

        <div className="std-status-card">
          <img alt="" aria-hidden="true" className="std-status-card-bg" src={`${ASSET_PATH}/status-box-bg.png`} />
          <div className="std-status-card-content">
            <img alt="상태변경" className="std-status-title-img" src={`${ASSET_PATH}/status-title.png`} />
            <div className="std-status-grid">
              <button
                aria-label="재택"
                aria-pressed={activeChoice === "home"}
                className={`std-status-button ${activeChoice === "home" ? "active" : ""}`}
                onClick={() => chooseStatus("home")}
                type="button"
              >
                <img alt="" src={`${ASSET_PATH}/button-home.png`} />
              </button>
              <button
                aria-label="사무실"
                aria-pressed={activeChoice === "office"}
                className={`std-status-button ${activeChoice === "office" ? "active" : ""}`}
                onClick={() => chooseStatus("office")}
                type="button"
              >
                <img alt="" src={`${ASSET_PATH}/button-office.png`} />
              </button>
              <button
                aria-label="자리비움"
                aria-pressed={activeChoice === "away"}
                className={`std-status-button ${activeChoice === "away" ? "active" : ""}`}
                onClick={() => chooseStatus("away")}
                type="button"
              >
                <img alt="" src={`${ASSET_PATH}/button-away.png`} />
              </button>
              <button
                aria-label="퇴근"
                aria-pressed={activeChoice === "leave"}
                className={`std-status-button ${activeChoice === "leave" ? "active" : ""}`}
                onClick={() => chooseStatus("leave")}
                type="button"
              >
                <img alt="" src={`${ASSET_PATH}/button-leave.png`} />
              </button>
            </div>
            <form id="std-todo-form" onSubmit={submitTodo}>
              <div className="std-input-frame">
                <img alt="" aria-hidden="true" className="std-input-bg" src={`${ASSET_PATH}/input-bg.png`} />
                <input
                  aria-label="오늘 진행할 업무"
                  className="std-input"
                  disabled={isSubmitting}
                  maxLength={160}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="오늘 진행할 업무를 적어주세요"
                  value={title}
                />
              </div>
              <label className="office-todo-public-control" htmlFor="std-todo-public">
                <input
                  checked={isPublic}
                  disabled={isSubmitting}
                  id="std-todo-public"
                  onChange={(event) => setIsPublic(event.target.checked)}
                  type="checkbox"
                />
                팀에 공개하기
              </label>
            </form>
          </div>
        </div>
      </div>

      {writeError || controller.error ? (
        <div className="office-request-error">
          <p className="office-panel-error">{writeError ?? controller.error}</p>
          {controller.error ? (
            <button
              className="office-secondary-button"
              disabled={controller.isLoading || isSubmitting}
              onClick={() => void controller.refresh()}
              type="button"
            >
              {controller.isLoading ? <><RequestSpinner />다시 불러오는 중</> : "다시 시도"}
            </button>
          ) : null}
        </div>
      ) : null}

      <section aria-label="내 TODO 목록" className="std-todo-card">
        <img alt="" aria-hidden="true" className="std-todo-card-bg" src={`${ASSET_PATH}/todo-box-dotted.png`} />
        <div className="std-todo-card-content">
          <div className="std-todo-scroll">
          {controller.isLoading ? (
            <p className="office-panel-message"><RequestSpinner />TODO 정보를 불러오는 중입니다.</p>
          ) : null}
          {!controller.isLoading && controller.ownTodos.length === 0 ? (
            <div className="std-todo-empty">
              <img alt="TODO" src={`${ASSET_PATH}/todo-empty.png`} />
              <p>아직 작성한 TODO가 없습니다.</p>
            </div>
          ) : (
            <ul className="std-todo-list">
              {controller.ownTodos.map((todo) => (
                <li key={todo.id}>
                  <div className="std-todo-item-head">
                    <p>{todo.title}</p>
                    <button
                      aria-label={`${todo.title} 삭제`}
                      className="std-todo-delete-button"
                      disabled={isSubmitting}
                      onClick={() => void deleteTodo(todo.id)}
                      type="button"
                    >
                      ×
                    </button>
                  </div>
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
                    <label className="office-todo-public-control" htmlFor={`std-todo-public-${todo.id}`}>
                      <input
                        checked={todo.isPublic}
                        disabled={isSubmitting}
                        id={`std-todo-public-${todo.id}`}
                        onChange={(event) => void updateTodo(todo.id, { isPublic: event.target.checked })}
                        type="checkbox"
                      />
                      공개
                    </label>
                  </div>
                </li>
              ))}
            </ul>
          )}
          </div>
        </div>
      </section>
    </aside>
  );
}
