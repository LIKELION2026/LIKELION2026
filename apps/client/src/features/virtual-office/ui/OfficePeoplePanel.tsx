import { type TodoStatus } from "@likelion2026/shared";
import { useState } from "react";

import type { PeopleContextMember } from "../model/people-context";
import {
  getCalendarPresenceLabel,
  getCalendarPresenceTone
} from "../model/calendar-presence";

interface OfficePeoplePanelProps {
  isOpen: boolean;
  members: PeopleContextMember[];
  onClose: () => void;
  onFocusMember: (member: PeopleContextMember) => void;
  onRequestSummon: (member: PeopleContextMember) => void;
  todoError: string | null;
  todoIsLoading: boolean;
}

const ASSET_PATH = "/assets/people";

const COUNTRY_LABELS = {
  KR: "한국",
  VN: "베트남"
} as const;

const COUNTRY_FLAGS = {
  KR: "🇰🇷",
  VN: "🇻🇳"
} as const;

const TONE_BADGE_IMAGE: Partial<Record<string, string>> = {
  away: `${ASSET_PATH}/badge-away.png`,
  remote_work: `${ASSET_PATH}/badge-remote-work.png`,
  sleeping: `${ASSET_PATH}/badge-sleeping.png`
};

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
    <aside aria-label="피플 목록" className="people-panel">
      <button aria-label="피플 목록 닫기" className="people-close-button" onClick={onClose} type="button">
        <img alt="" src={`${ASSET_PATH}/close-button.png`} />
      </button>
      <div className="people-panel-content">
        <div className="people-panel-header">
          <p className="office-panel-eyebrow">TEAM</p>
          <h2>피플 목록</h2>
        </div>
        {members.length === 0 ? (
          <p className="office-panel-message">현재 오피스에 표시할 팀원이 없습니다.</p>
        ) : (
          <ul className="people-row-list">
            {members.map((context) => (
              <li key={context.member.memberId}>
                <button
                  aria-pressed={selectedContext?.member.memberId === context.member.memberId}
                  className="people-row"
                  onClick={() => setSelectedMemberId(context.member.memberId)}
                  type="button"
                >
                  <img alt="" aria-hidden="true" className="people-row-bg" src={`${ASSET_PATH}/row-bg.png`} />
                  <span className="people-row-flag" aria-hidden="true">
                    {COUNTRY_FLAGS[context.member.language === "vi" ? "VN" : "KR"]}
                  </span>
                  <span className="people-row-name">
                    {context.member.displayName}
                    {context.isSelf ? " (나)" : ""}
                  </span>
                  <StatusBadge member={context.member} />
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
      </div>
    </aside>
  );
}

function StatusBadge({ member }: { member: PeopleContextMember["member"] }): React.JSX.Element {
  const tone = getCalendarPresenceTone(member);
  const label = getCalendarPresenceLabel(member);
  const image = TONE_BADGE_IMAGE[tone];

  if (image) {
    return <img alt={label} className="people-status-badge-img" src={image} />;
  }

  return (
    <span className={`people-status-badge tone-${tone}`}>
      <span aria-hidden="true" className="people-status-dot" />
      {label}
    </span>
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

  return (
    <article className="people-detail-card">
      <div className="people-detail-summary">
        <div>
          <h3>
            {COUNTRY_FLAGS[member.language === "vi" ? "VN" : "KR"]} {member.displayName}
            {context.isSelf ? " (나)" : ""}
          </h3>
          <p>{COUNTRY_LABELS[member.language === "vi" ? "VN" : "KR"]}</p>
        </div>
        <StatusBadge member={member} />
      </div>
      <div className="people-detail-actions">
        <button className="office-secondary-button" onClick={() => onFocusMember(context)} type="button">
          찾아가기
        </button>
        {!context.isSelf ? (
          <button className="office-secondary-button" onClick={() => onRequestSummon(context)} type="button">
            불러오기
          </button>
        ) : null}
      </div>
      <section aria-label={`${member.displayName}의 공개 TODO`} className="people-detail-todos">
        <p className="office-panel-eyebrow">공개한 오늘의 업무</p>
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
