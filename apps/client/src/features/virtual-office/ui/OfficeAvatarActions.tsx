import type { JSX } from "react";

import type { PeopleContextMember } from "../model/people-context";
import { getCalendarPresenceLabel, getCalendarPresenceTone } from "../model/calendar-presence";
import { AvatarFace } from "./AvatarFace";

interface OfficeAvatarActionsProps {
  context: PeopleContextMember | null;
  onClose: () => void;
  onFocusMember: (context: PeopleContextMember) => void;
  onMessageMember: (context: PeopleContextMember) => void;
  onRequestSummon: (context: PeopleContextMember) => void;
}

export function OfficeAvatarActions({
  context,
  onClose,
  onFocusMember,
  onMessageMember,
  onRequestSummon
}: OfficeAvatarActionsProps): JSX.Element | null {
  if (!context || context.isSelf) {
    return null;
  }

  const { member, publicTodos } = context;
  const tone = getCalendarPresenceTone(member);

  return (
    <aside aria-label={`${member.displayName} 상호작용`} className="avatar-actions-panel">
      <button aria-label="팀원 메뉴 닫기" className="avatar-actions-close" onClick={onClose} type="button">×</button>
      <div className="avatar-actions-profile">
        <div className="avatar-actions-face"><AvatarFace avatarId={member.avatarId} size={68} /></div>
        <div>
          <p className="avatar-actions-eyebrow">TEAMMATE</p>
          <h2>{member.displayName}</h2>
          <span className={`avatar-actions-status tone-${tone}`}>{getCalendarPresenceLabel(member)}</span>
        </div>
      </div>
      <div className="avatar-actions-buttons">
        <button onClick={() => onFocusMember(context)} type="button">찾아가기</button>
        <button onClick={() => onRequestSummon(context)} type="button">불러오기</button>
        <button className="primary" onClick={() => onMessageMember(context)} type="button">메시지 보내기</button>
      </div>
      <section aria-label={`${member.displayName}의 공개 TODO`} className="avatar-actions-todos">
        <p>오늘의 공개 TODO</p>
        {publicTodos.length === 0 ? (
          <span>공개한 업무가 없습니다.</span>
        ) : (
          <ul>
            {publicTodos.slice(0, 3).map((todo) => <li key={todo.id}>{todo.title}</li>)}
          </ul>
        )}
      </section>
    </aside>
  );
}
