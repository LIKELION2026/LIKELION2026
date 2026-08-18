import { MEMBER_STATUS_LABELS, type TodoStatus } from "@likelion2026/shared";
import { useState } from "react";

import type { PeopleContextMember } from "../model/people-context";

interface OfficePeoplePanelProps {
  isOpen: boolean;
  members: PeopleContextMember[];
  onClose: () => void;
  onFocusMember: (member: PeopleContextMember) => void;
  onRequestSummon: (member: PeopleContextMember) => void;
  todoError: string | null;
  todoIsLoading: boolean;
}

const COUNTRY_LABELS = {
  KR: "한국",
  VN: "베트남"
} as const;

const TODO_STATUS_LABELS: Record<TodoStatus, string> = {
  blocked: "도움 필요",
  done: "완료",
  in_progress: "진행 중",
  planned: "예정"
};

export function OfficePeoplePanel({
  isOpen,
  members,
  onClose,
  onFocusMember,
  onRequestSummon,
  todoError,
  todoIsLoading
}: OfficePeoplePanelProps): React.JSX.Element | null {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const selectedContext =
    members.find((context) => context.member.memberId === selectedMemberId) ?? members[0];

  if (!isOpen) {
    return null;
  }

  return (
    <aside aria-label="피플 목록" className="office-people-panel">
      <div className="office-people-panel-header">
        <div>
          <p className="office-panel-eyebrow">TEAM</p>
          <h2>피플 목록</h2>
        </div>
        <button aria-label="피플 목록 닫기" className="office-icon-button" onClick={onClose} type="button">
          ×
        </button>
      </div>
      {members.length === 0 ? (
        <p className="office-panel-message">현재 오피스에 표시할 팀원이 없습니다.</p>
      ) : (
        <ul className="office-member-list">
          {members.map((context) => (
            <li key={context.member.memberId}>
              <button
                aria-pressed={selectedContext?.member.memberId === context.member.memberId}
                className="office-member-list-button"
                onClick={() => setSelectedMemberId(context.member.memberId)}
                type="button"
              >
                <span>{context.member.displayName}{context.isSelf ? " (나)" : ""}</span>
                <span>{getConnectionLabel(context.member)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {selectedContext ? (
        <MemberProfile
          context={selectedContext}
          onFocusMember={onFocusMember}
          onRequestSummon={onRequestSummon}
          todoError={todoError}
          todoIsLoading={todoIsLoading}
        />
      ) : null}
    </aside>
  );
}

interface MemberProfileProps {
  context: PeopleContextMember;
  onFocusMember: (member: PeopleContextMember) => void;
  onRequestSummon: (member: PeopleContextMember) => void;
  todoError: string | null;
  todoIsLoading: boolean;
}

function MemberProfile({
  context,
  onFocusMember,
  onRequestSummon,
  todoError,
  todoIsLoading
}: MemberProfileProps): React.JSX.Element {
  const { member, publicTodos } = context;
  const displayMode = member.officePresence?.displayMode;
  const connectionLabel = getConnectionLabel(member);

  return (
    <article className="office-member-card">
      <div className="office-member-summary">
        <div>
          <h3>{member.displayName}{context.isSelf ? " (나)" : ""}</h3>
          <p>{COUNTRY_LABELS[member.language === "vi" ? "VN" : "KR"]} · {connectionLabel}</p>
        </div>
        <span className={`office-member-status ${displayMode ?? "active"}`} aria-label={connectionLabel} />
      </div>
      <div className="office-member-actions">
        <button className="office-secondary-button" onClick={() => onFocusMember(context)} type="button">
          찾아가기
        </button>
        {!context.isSelf ? (
          <button className="office-secondary-button" onClick={() => onRequestSummon(context)} type="button">
            불러오기
          </button>
        ) : null}
      </div>
      <section aria-label={`${member.displayName}의 공개 TODO`} className="office-member-todos">
        <p className="office-member-todos-title">공개한 오늘의 업무</p>
        {todoIsLoading ? <p className="office-panel-message">TODO 정보를 불러오는 중입니다.</p> : null}
        {todoError ? <p className="office-panel-error">TODO 정보를 불러오지 못했습니다.</p> : null}
        {!todoIsLoading && !todoError && publicTodos.length === 0 ? (
          <p className="office-panel-message">공개한 오늘의 업무가 없습니다.</p>
        ) : null}
        {!todoIsLoading && !todoError && publicTodos.length > 0 ? (
          <ul>
            {publicTodos.map((todo) => (
              <li key={todo.id}>
                <span>{todo.title}</span>
                <span className={`office-todo-status ${todo.status}`}>{TODO_STATUS_LABELS[todo.status]}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </article>
  );
}

function getConnectionLabel(member: PeopleContextMember["member"]): string {
  const displayMode = member.officePresence?.displayMode;
  if (displayMode === "ghost") {
    return "연결 해제";
  }
  if (displayMode === "sleeping") {
    return "퇴근";
  }
  return MEMBER_STATUS_LABELS[member.status];
}
