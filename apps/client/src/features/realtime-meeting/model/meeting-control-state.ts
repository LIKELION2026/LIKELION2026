export interface MeetingControlStateInput {
  canControlMedia: boolean;
  isEnabled: boolean;
  isLeaving: boolean;
  isUpdating: boolean;
}

export interface MeetingControlButtonState {
  disabled: boolean;
  labelKey: string;
  pressed: boolean;
  statusKey: string;
}

export function createMicrophoneControlState({
  canControlMedia,
  isEnabled,
  isLeaving,
  isUpdating
}: MeetingControlStateInput): MeetingControlButtonState {
  return {
    disabled: !canControlMedia || isLeaving || isUpdating,
    labelKey: isUpdating
      ? "meetingControls.microphone.updating"
      : isEnabled
        ? "meetingControls.microphone.disable"
        : "meetingControls.microphone.enable",
    pressed: isEnabled,
    statusKey: isEnabled
      ? "meetingControls.microphone.enabled"
      : "meetingControls.microphone.disabled"
  };
}

export function createCameraControlState({
  canControlMedia,
  isEnabled,
  isLeaving,
  isUpdating
}: MeetingControlStateInput): MeetingControlButtonState {
  return {
    disabled: !canControlMedia || isLeaving || isUpdating,
    labelKey: isUpdating
      ? "meetingControls.camera.updating"
      : isEnabled
        ? "meetingControls.camera.disable"
        : "meetingControls.camera.enable",
    pressed: isEnabled,
    statusKey: isEnabled
      ? "meetingControls.camera.enabled"
      : "meetingControls.camera.disabled"
  };
}

export function createExpandViewControlState(
  isExpanded: boolean
): MeetingControlButtonState {
  return {
    disabled: false,
    labelKey: isExpanded
      ? "meetingControls.expandedView.collapse"
      : "meetingControls.expandedView.expand",
    pressed: isExpanded,
    statusKey: isExpanded
      ? "meetingControls.expandedView.expanded"
      : "meetingControls.expandedView.normal"
  };
}

export function createTranslationControlState(
  isEnabled: boolean,
  isPending = false,
  isUnavailable = false
): MeetingControlButtonState {
  return {
    disabled: isPending || isUnavailable,
    labelKey: isPending
      ? "meetingControls.translation.updating"
      : isEnabled
        ? "meetingControls.translation.disable"
        : "meetingControls.translation.enable",
    pressed: isEnabled,
    statusKey: isUnavailable
      ? "meetingControls.translation.unavailable"
      : isEnabled
        ? "meetingControls.translation.enabled"
        : "meetingControls.translation.disabled"
  };
}
