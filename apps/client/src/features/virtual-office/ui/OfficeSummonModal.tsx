import type { OfficeSummonRequestedPayload } from "@likelion2026/shared";
import { useTranslation } from "react-i18next";

interface OfficeSummonModalProps {
  onRespond: (decision: "accepted" | "declined") => void;
  request: OfficeSummonRequestedPayload | null;
}

export function OfficeSummonModal({ onRespond, request }: OfficeSummonModalProps): React.JSX.Element | null {
  const { t } = useTranslation();

  if (!request) {
    return null;
  }

  return (
    <div className="office-summon-backdrop">
      <section aria-modal="true" className="office-summon-modal" role="dialog">
        <p className="office-panel-eyebrow">{t("officeSummon.eyebrow")}</p>
        <h2>{t("officeSummon.title", { requesterName: request.requesterName })}</h2>
        <div className="office-summon-actions">
          <button className="office-secondary-button" onClick={() => onRespond("declined")} type="button">
            {t("officeSummon.decline")}
          </button>
          <button className="attendance-button" onClick={() => onRespond("accepted")} type="button">
            {t("officeSummon.accept")}
          </button>
        </div>
      </section>
    </div>
  );
}
