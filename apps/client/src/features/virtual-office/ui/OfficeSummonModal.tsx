import type { OfficeSummonRequestedPayload } from "@likelion2026/shared";

interface OfficeSummonModalProps {
  onRespond: (decision: "accepted" | "declined") => void;
  request: OfficeSummonRequestedPayload | null;
}

export function OfficeSummonModal({ onRespond, request }: OfficeSummonModalProps): React.JSX.Element | null {
  if (!request) {
    return null;
  }

  return (
    <div className="office-summon-backdrop">
      <section aria-modal="true" className="office-summon-modal" role="dialog">
        <p className="office-panel-eyebrow">TEAM REQUEST</p>
        <h2>{request.requesterName}가 당신을 불러오기를 원합니다.</h2>
        <div className="office-summon-actions">
          <button className="office-secondary-button" onClick={() => onRespond("declined")} type="button">
            거절
          </button>
          <button className="attendance-button" onClick={() => onRespond("accepted")} type="button">
            이동하기
          </button>
        </div>
      </section>
    </div>
  );
}
