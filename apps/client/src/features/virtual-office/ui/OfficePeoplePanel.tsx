import { useState } from "react";
import type { ComponentType, SVGProps } from "react";
import { DoorOpen, Home, Moon } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { PeopleContextMember } from "../model/people-context";
import {
  getCalendarPresenceTranslationKey,
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

const COUNTRY_FLAGS = {
  KR: "🇰🇷",
  VN: "🇻🇳"
} as const;

type StatusBadgeIcon = ComponentType<SVGProps<SVGSVGElement>>;

const TONE_BADGE_ICONS: Partial<Record<string, StatusBadgeIcon>> = {
  away: DoorOpen,
  remote_work: Home,
  sleeping: Moon
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
  const { t } = useTranslation();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const selectedContext =
    members.find((context) => context.member.memberId === selectedMemberId) ?? members[0];

  if (!isOpen) {
    return null;
  }

  return (
    <aside aria-label={t("officePeoplePanel.ariaLabel")} className="people-panel">
      <button aria-label={t("officePeoplePanel.close")} className="people-close-button" onClick={onClose} type="button">
        <img alt="" src={`${ASSET_PATH}/close-button.png`} />
      </button>
      <div className="people-panel-content">
        <div className="people-panel-header">
          <p className="office-panel-eyebrow">{t("officePeoplePanel.teamEyebrow")}</p>
          <h2>{t("officePeoplePanel.title")}</h2>
        </div>
        <div className="people-list-scroll-area">
          {members.length === 0 ? (
            <p className="office-panel-message">{t("officePeoplePanel.empty")}</p>
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
                      {context.isSelf ? t("common.selfSuffix") : ""}
                    </span>
                    <StatusBadge member={context.member} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
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
  const { t } = useTranslation();
  const tone = getCalendarPresenceTone(member);
  const label = t(getCalendarPresenceTranslationKey(member));
  const Icon = TONE_BADGE_ICONS[tone];

  return (
    <span className={`people-status-badge tone-${tone}`}>
      {Icon ? (
        <Icon aria-hidden="true" className="people-status-icon" />
      ) : (
        <span aria-hidden="true" className="people-status-dot" />
      )}
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
  const { t } = useTranslation();
  const { member, publicTodos } = context;

  return (
    <article className="people-detail-card">
      <div className="people-detail-summary">
        <div>
          <h3>
            {COUNTRY_FLAGS[member.language === "vi" ? "VN" : "KR"]} {member.displayName}
            {context.isSelf ? t("common.selfSuffix") : ""}
          </h3>
          <p>
            {t(
              member.language === "vi"
                ? "officePeoplePanel.country.vietnam"
                : "officePeoplePanel.country.korea"
            )}
          </p>
        </div>
        <StatusBadge member={member} />
      </div>
      <div className="people-detail-actions">
        <button className="office-secondary-button" onClick={() => onFocusMember(context)} type="button">
          {t("officePeoplePanel.focus")}
        </button>
        {!context.isSelf ? (
          <button className="office-secondary-button" onClick={() => onRequestSummon(context)} type="button">
            {t("officePeoplePanel.summon")}
          </button>
        ) : null}
      </div>
      <section
        aria-label={t("officePeoplePanel.profileTodoAriaLabel", {
          name: member.displayName
        })}
        className="people-detail-todos"
      >
        <p className="office-panel-eyebrow">{t("officePeoplePanel.publicTodoTitle")}</p>
        {todoIsLoading ? <p className="office-panel-message">{t("officePeoplePanel.todoLoading")}</p> : null}
        {todoError ? <p className="office-panel-error">{t("officePeoplePanel.todoLoadError")}</p> : null}
        {!todoIsLoading && !todoError && publicTodos.length === 0 ? (
          <p className="office-panel-message">{t("officePeoplePanel.publicTodoEmpty")}</p>
        ) : null}
        {!todoIsLoading && !todoError && publicTodos.length > 0 ? (
          <ul>
            {publicTodos.map((todo) => (
              <li key={todo.id}>
                <span>{todo.title}</span>
                <span className={`office-todo-status ${todo.status}`}>{t(`todoStatus.${todo.status}`)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </article>
  );
}
