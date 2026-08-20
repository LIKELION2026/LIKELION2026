import { useState } from "react";
import type { FormEvent } from "react";
import type { AttendanceStatus, MemberStatus, TodoStatus } from "@likelion2026/shared";
import { Building2, DoorOpen, Home, Moon, Save } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { useTranslation } from "react-i18next";

import type { OfficeTodoController } from "../model/use-office-todos";
import { RequestSpinner, useRequestFeedback } from "../../../app/request-feedback";
import { AvatarFace } from "./AvatarFace";

interface OfficeTodoPanelProps {
  avatarId: string | undefined;
  countryCode: string | undefined;
  controller: OfficeTodoController;
  isOpen: boolean;
  memberName: string | undefined;
  onAttendanceChange: (attendanceStatus: AttendanceStatus) => void;
  onClose: () => void;
  onStatusChange: (status: MemberStatus) => void;
  selfAttendanceStatus: AttendanceStatus | undefined;
  selfStatus: MemberStatus | undefined;
}

const TODO_STATUSES: TodoStatus[] = ["planned", "in_progress", "done", "blocked"];

const ASSET_PATH = "/assets/status-todo";
type Workplace = "home" | "office";
type StatusChoice = Workplace | "away" | "leave";
type StatusChoiceIcon = ComponentType<SVGProps<SVGSVGElement>>;

const STATUS_CHOICES: Array<{
  icon: StatusChoiceIcon;
  translationKey: string;
  value: StatusChoice;
}> = [
  { icon: Home, translationKey: "officeTodoPanel.statusChoices.home", value: "home" },
  { icon: Building2, translationKey: "officeTodoPanel.statusChoices.office", value: "office" },
  { icon: DoorOpen, translationKey: "officeTodoPanel.statusChoices.away", value: "away" },
  { icon: Moon, translationKey: "officeTodoPanel.statusChoices.leave", value: "leave" }
];

export function OfficeTodoPanel({
  avatarId,
  countryCode,
  controller,
  isOpen,
  memberName,
  onAttendanceChange,
  onClose,
  onStatusChange,
  selfAttendanceStatus,
  selfStatus
}: OfficeTodoPanelProps): React.JSX.Element | null {
  const { t } = useTranslation();
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
  const countryLabel = countryCode === "VN" ? "베트남" : "한국";
  const countryFlag = countryCode === "VN" ? "🇻🇳" : "🇰🇷";

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
      showSuccess(t("officeTodoPanel.todoSaveSuccess"));
    } catch (error) {
      setWriteError(t("officeTodoPanel.todoSaveError"));
      showError(error, t("officeTodoPanel.todoSaveError"));
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
      showSuccess(t("officeTodoPanel.todoUpdateSuccess"));
    } catch (error) {
      setWriteError(t("officeTodoPanel.todoUpdateError"));
      showError(error, t("officeTodoPanel.todoUpdateError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteTodo = async (todoId: string) => {
    setIsSubmitting(true);
    setWriteError(null);
    try {
      await controller.deleteTodo(todoId);
      showSuccess(t("officeTodoPanel.todoDeleteSuccess"));
    } catch (error) {
      setWriteError(t("officeTodoPanel.todoDeleteError"));
      showError(error, t("officeTodoPanel.todoDeleteError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <aside aria-label={t("officeTodoPanel.ariaLabel")} className="std-panel">
      <header className="std-header">
        <h2 className="std-title-text">{t("officeTodoPanel.title")}</h2>
        <div className="std-header-actions">
          <button
            aria-label={t("officeTodoPanel.save")}
            className="std-save-button"
            disabled={isSubmitting || (!hasPendingStatusChange && !title.trim())}
            form="std-todo-form"
            type="submit"
          >
            <Save aria-hidden="true" className="std-save-icon" />
            <span>{t("officeTodoPanel.save")}</span>
          </button>
          <button aria-label={t("officeTodoPanel.close")} className="office-icon-button" onClick={onClose} type="button">
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
          <div className="std-member-info">
            <strong>{memberName ?? "내 프로필"}</strong>
            <span>{countryFlag} {countryLabel}</span>
          </div>
        </div>

        <div className="std-status-card">
          <img alt="" aria-hidden="true" className="std-status-card-bg" src={`${ASSET_PATH}/status-box-bg.png`} />
          <div className="std-status-card-content">
            <h3 className="std-status-title-text">{t("officeTodoPanel.statusTitle")}</h3>
            <div className="std-status-grid">
              {STATUS_CHOICES.map((choice) => {
                const Icon = choice.icon;
                const label = t(choice.translationKey);

                return (
                  <button
                    aria-label={label}
                    aria-pressed={activeChoice === choice.value}
                    className={`std-status-button ${activeChoice === choice.value ? "active" : ""}`}
                    key={choice.value}
                    onClick={() => chooseStatus(choice.value)}
                    type="button"
                  >
                    <Icon aria-hidden="true" className="std-status-button-icon" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
            <form id="std-todo-form" onSubmit={submitTodo}>
              <div className="std-input-frame">
                <img alt="" aria-hidden="true" className="std-input-bg" src={`${ASSET_PATH}/input-bg.png`} />
                <input
                  aria-label={t("officeTodoPanel.inputAriaLabel")}
                  className="std-input"
                  disabled={isSubmitting}
                  maxLength={160}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t("officeTodoPanel.inputPlaceholder")}
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
                {t("officeTodoPanel.publicToTeam")}
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
              {controller.isLoading ? (
                <>
                  <RequestSpinner />
                  {t("officeTodoPanel.retrying")}
                </>
              ) : (
                t("officeTodoPanel.retry")
              )}
            </button>
          ) : null}
        </div>
      ) : null}

      <section aria-label={t("officeTodoPanel.listAriaLabel")} className="std-todo-card">
        <img alt="" aria-hidden="true" className="std-todo-card-bg" src={`${ASSET_PATH}/todo-box-dotted.png`} />
        <div className="std-todo-card-content">
          <div className="std-todo-scroll">
          {controller.isLoading ? (
            <p className="office-panel-message"><RequestSpinner />{t("officeTodoPanel.loading")}</p>
          ) : null}
          {!controller.isLoading && controller.ownTodos.length === 0 ? (
            <div className="std-todo-empty">
              <img alt="TODO" src={`${ASSET_PATH}/todo-empty.png`} />
              <p>{t("officeTodoPanel.empty")}</p>
            </div>
          ) : (
            <ul className="std-todo-list">
              {controller.ownTodos.map((todo) => (
                <li key={todo.id}>
                  <div className="std-todo-item-head">
                    <p>{todo.title}</p>
                    <button
                      aria-label={t("officeTodoPanel.todoDeleteAriaLabel", { title: todo.title })}
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
                      aria-label={t("officeTodoPanel.statusAriaLabel", { title: todo.title })}
                      disabled={isSubmitting}
                      onChange={(event) =>
                        void updateTodo(todo.id, { status: event.target.value as TodoStatus })
                      }
                      value={todo.status}
                    >
                      {TODO_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {t(`todoStatus.${status}`)}
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
                      {t("officeTodoPanel.public")}
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
