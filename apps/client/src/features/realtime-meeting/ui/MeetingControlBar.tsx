import type { JSX, ReactNode } from "react";
import {
  Globe,
  GlobeOff,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Video,
  VideoOff,
  type LucideIcon
} from "lucide-react";

import {
  createCameraControlState,
  createExpandViewControlState,
  createMicrophoneControlState,
  createTranslationControlState
} from "../model/meeting-control-state";

interface MeetingControlBarProps {
  canControlMedia: boolean;
  extraControlSlot?: ReactNode;
  isCameraEnabled: boolean;
  isCameraUpdating: boolean;
  isExpandedView: boolean;
  isLeaving: boolean;
  isMicrophoneEnabled: boolean;
  isMicrophoneUpdating: boolean;
  isTranslationEnabled: boolean;
  onCameraToggle: () => void;
  onExpandedViewToggle: () => void;
  onMicrophoneToggle: () => void;
  onTranslationToggle: () => void;
}

export function MeetingControlBar({
  canControlMedia,
  extraControlSlot,
  isCameraEnabled,
  isCameraUpdating,
  isExpandedView,
  isLeaving,
  isMicrophoneEnabled,
  isMicrophoneUpdating,
  isTranslationEnabled,
  onCameraToggle,
  onExpandedViewToggle,
  onMicrophoneToggle,
  onTranslationToggle
}: MeetingControlBarProps): JSX.Element {
  const microphone = createMicrophoneControlState({
    canControlMedia,
    isEnabled: isMicrophoneEnabled,
    isLeaving,
    isUpdating: isMicrophoneUpdating
  });
  const camera = createCameraControlState({
    canControlMedia,
    isEnabled: isCameraEnabled,
    isLeaving,
    isUpdating: isCameraUpdating
  });
  const expandedView = createExpandViewControlState(isExpandedView);
  const translation = createTranslationControlState(isTranslationEnabled);
  const MicrophoneIcon = microphone.pressed ? Mic : MicOff;
  const CameraIcon = camera.pressed ? Video : VideoOff;
  const ExpandedViewIcon = expandedView.pressed ? Minimize2 : Maximize2;
  const TranslationIcon = translation.pressed ? Globe : GlobeOff;

  return (
    <div aria-label="회의 컨트롤" className="meeting-control-bar" role="toolbar">
      <button
        aria-label={`${microphone.label}. ${microphone.statusText}`}
        aria-pressed={microphone.pressed}
        className={getControlButtonClassName({
          isOff: !microphone.pressed,
          isUpdating: isMicrophoneUpdating
        })}
        disabled={microphone.disabled}
        onClick={onMicrophoneToggle}
        title={microphone.statusText}
        type="button"
      >
        <ControlIcon icon={MicrophoneIcon} />
      </button>
      <button
        aria-label={`${camera.label}. ${camera.statusText}`}
        aria-pressed={camera.pressed}
        className={getControlButtonClassName({
          isOff: !camera.pressed,
          isUpdating: isCameraUpdating
        })}
        disabled={camera.disabled}
        onClick={onCameraToggle}
        title={camera.statusText}
        type="button"
      >
        <ControlIcon icon={CameraIcon} />
      </button>
      <button
        aria-label={`${expandedView.label}. ${expandedView.statusText}`}
        aria-pressed={expandedView.pressed}
        className={getControlButtonClassName({
          isActive: expandedView.pressed,
          isOff: false,
          isUpdating: false
        })}
        disabled={expandedView.disabled}
        onClick={onExpandedViewToggle}
        title={expandedView.statusText}
        type="button"
      >
        <ControlIcon icon={ExpandedViewIcon} />
      </button>
      <button
        aria-label={`${translation.label}. ${translation.statusText}`}
        aria-pressed={translation.pressed}
        className={getControlButtonClassName({
          isOff: !translation.pressed,
          isUpdating: translation.disabled
        })}
        disabled={translation.disabled}
        onClick={onTranslationToggle}
        title="후속 번역 이슈에서 언어 설정 모달과 연결됩니다."
        type="button"
      >
        <ControlIcon icon={TranslationIcon} />
      </button>
      {extraControlSlot}
    </div>
  );
}

function ControlIcon({ icon: Icon }: { icon: LucideIcon }): JSX.Element {
  return (
    <Icon
      aria-hidden="true"
      className="meeting-control-icon"
      size={23}
      strokeWidth={2.35}
    />
  );
}

function getControlButtonClassName({
  isActive = false,
  isOff,
  isUpdating
}: {
  isActive?: boolean;
  isOff: boolean;
  isUpdating: boolean;
}): string {
  return [
    "meeting-control-button",
    isActive ? "active" : "",
    isOff ? "off" : "on",
    isUpdating ? "updating" : ""
  ]
    .filter(Boolean)
    .join(" ");
}
