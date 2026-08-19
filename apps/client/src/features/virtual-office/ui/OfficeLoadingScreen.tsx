import type { JSX } from "react";

export function OfficeLoadingScreen(): JSX.Element {
  return (
    <section aria-label="오피스 준비 중" className="office-loading-screen" role="status">
      <div className="office-loading-mark" aria-hidden="true" />
      <p className="office-loading-brand">GLOBAL OFFICE</p>
      <p className="office-loading-message">오피스를 준비하고 있어요</p>
      <span aria-hidden="true" className="office-loading-dots">
        <i />
        <i />
        <i />
      </span>
    </section>
  );
}
