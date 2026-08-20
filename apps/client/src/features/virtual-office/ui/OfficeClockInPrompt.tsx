interface OfficeClockInPromptProps {
  isOpen: boolean;
  onClockIn: () => void;
  onDefer: () => void;
}

export function OfficeClockInPrompt({
  isOpen,
  onClockIn,
  onDefer
}: OfficeClockInPromptProps): React.JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="office-clock-in-backdrop">
      <section aria-modal="true" className="office-clock-in-prompt" role="dialog">
        <p className="office-panel-eyebrow">OFFICE CHECK-IN</p>
        <h2>출근하시겠습니까?</h2>
        <p>출근하면 팀원에게 활동 중인 상태로 표시되고 오피스를 이용할 수 있어요.</p>
        <div className="office-clock-in-actions">
          <button className="office-secondary-button" onClick={onDefer} type="button">
            잠시 보류
          </button>
          <button className="attendance-button" onClick={onClockIn} type="button">
            출근하기
          </button>
        </div>
      </section>
    </div>
  );
}
