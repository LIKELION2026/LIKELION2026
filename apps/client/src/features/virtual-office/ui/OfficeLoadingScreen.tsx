import type { JSX } from "react";
import { useTranslation } from "react-i18next";

export function OfficeLoadingScreen(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section
      aria-label={t("officeLoading.ariaLabel")}
      className="office-loading-screen"
      role="status"
    >
      <div className="office-loading-mark" aria-hidden="true" />
      <p className="office-loading-brand">GLOBAL OFFICE</p>
      <p className="office-loading-message">{t("officeLoading.message")}</p>
      <span aria-hidden="true" className="office-loading-dots">
        <i />
        <i />
        <i />
      </span>
    </section>
  );
}
