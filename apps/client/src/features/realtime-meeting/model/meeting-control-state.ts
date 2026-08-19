export interface MeetingControlStateInput {
  canControlMedia: boolean;
  isEnabled: boolean;
  isLeaving: boolean;
  isUpdating: boolean;
}

export interface MeetingControlButtonState {
  disabled: boolean;
  label: string;
  pressed: boolean;
  statusText: string;
}

export function createMicrophoneControlState({
  canControlMedia,
  isEnabled,
  isLeaving,
  isUpdating
}: MeetingControlStateInput): MeetingControlButtonState {
  return {
    disabled: !canControlMedia || isLeaving || isUpdating,
    label: isUpdating ? "소리 변경 중" : isEnabled ? "소리 끄기" : "소리 켜기",
    pressed: isEnabled,
    statusText: isEnabled ? "마이크 켜짐" : "마이크 꺼짐"
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
    label: isUpdating ? "영상 변경 중" : isEnabled ? "영상 끄기" : "영상 켜기",
    pressed: isEnabled,
    statusText: isEnabled ? "카메라 켜짐" : "카메라 꺼짐"
  };
}

export function createExpandViewControlState(
  isExpanded: boolean
): MeetingControlButtonState {
  return {
    disabled: false,
    label: isExpanded ? "화면 줄이기" : "화면 키우기",
    pressed: isExpanded,
    statusText: isExpanded ? "확대 화면 켜짐" : "일반 화면"
  };
}

export function createTranslationControlState(
  isEnabled: boolean,
  isPending = false
): MeetingControlButtonState {
  return {
    disabled: isPending,
    label: isPending
      ? "AI 번역 변경 중"
      : isEnabled
        ? "AI 번역 OFF"
        : "AI 번역 ON",
    pressed: isEnabled,
    statusText: isEnabled ? "번역 켜짐" : "번역 꺼짐"
  };
}
