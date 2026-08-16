import { useMemo, useState } from "react";
import type { JSX } from "react";
import type { OfficeMemberPresence } from "@likelion2026/shared";

interface PeopleDirectoryProps {
  members: OfficeMemberPresence[];
  onFocusMember: (memberId: string) => void;
  selfMemberId: string | undefined;
}

export function PeopleDirectory({
  members,
  onFocusMember,
  selfMemberId
}: PeopleDirectoryProps): JSX.Element {
  const [query, setQuery] = useState("");
  const visibleMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return [...members]
      .sort((left, right) => Number(right.memberId === selfMemberId) - Number(left.memberId === selfMemberId))
      .filter((member) =>
        member.displayName.toLocaleLowerCase().includes(normalizedQuery)
      );
  }, [members, query, selfMemberId]);

  return (
    <aside aria-label="피플 목록" className="people-directory">
      <div className="people-directory-header">
        <div>
          <h2>피플 목록</h2>
          <p>{members.length}명</p>
        </div>
      </div>
      <label className="people-directory-search" htmlFor="people-search">
        <span className="sr-only">구성원 검색</span>
        <input
          id="people-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="구성원 검색"
          type="search"
          value={query}
        />
      </label>
      <ul className="people-directory-list">
        {visibleMembers.map((member) => (
          <li key={member.memberId}>
            <article className="people-directory-member">
              <div className={`member-presence-dot ${getDisplayMode(member)}`} />
              <div className="people-directory-member-info">
                <strong>
                  {member.displayName}
                  {member.memberId === selfMemberId ? " (나)" : ""}
                </strong>
                <span>{getMemberStateLabel(member)}</span>
              </div>
              <button
                aria-label={`${member.displayName} 위치로 찾아가기`}
                className="member-focus-button"
                onClick={() => onFocusMember(member.memberId)}
                type="button"
              >
                찾아가기
              </button>
            </article>
          </li>
        ))}
      </ul>
      {visibleMembers.length === 0 ? (
        <p className="people-directory-empty">일치하는 구성원이 없습니다.</p>
      ) : null}
    </aside>
  );
}

function getDisplayMode(member: OfficeMemberPresence): string {
  return member.officePresence?.displayMode ?? "active";
}

function getMemberStateLabel(member: OfficeMemberPresence): string {
  const presence = member.officePresence;
  if (!presence || presence.displayMode === "ghost") {
    return "연결 해제";
  }
  if (presence.displayMode === "sleeping") {
    return "퇴근";
  }
  if (presence.displayMode === "vacation") {
    return "휴가 중";
  }
  if (presence.displayMode === "remote") {
    return "재택 근무";
  }
  if (presence.availabilityStatus === "focus") {
    return "집중 작업";
  }
  if (presence.availabilityStatus === "meeting") {
    return "회의 중";
  }
  return "협업 가능";
}
