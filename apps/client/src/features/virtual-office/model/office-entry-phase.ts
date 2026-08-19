export type OfficeEntryPhase = "loading" | "onboarding" | "office";

interface OfficeEntryPhaseInput {
  hasSession: boolean;
  isPreparingSession: boolean;
  isRestoringStoredSession: boolean;
  isSceneReady: boolean;
}

export function getOfficeEntryPhase({
  hasSession,
  isPreparingSession,
  isRestoringStoredSession,
  isSceneReady,
}: OfficeEntryPhaseInput): OfficeEntryPhase {
  if (isRestoringStoredSession || isPreparingSession || (hasSession && !isSceneReady)) {
    return "loading";
  }

  return hasSession ? "office" : "onboarding";
}
