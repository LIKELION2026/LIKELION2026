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
import { useTranslation } from "react-i18next";

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
  isTranslationDisabled?: boolean;
  isTranslationEnabled: boolean;
  isTranslationUpdating?: boolean;
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
  isTranslationDisabled = false,
  isTranslationEnabled,
  isTranslationUpdating = false,
  onCameraToggle,
  onExpandedViewToggle,
  onMicrophoneToggle,
  onTranslationToggle
}: MeetingControlBarProps): JSX.Element {
  const { t } = useTranslation();
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
  const translation = createTranslationControlState(
    isTranslationEnabled,
    isTranslationUpdating,
    isTranslationDisabled
  );
  const MicrophoneIcon = microphone.pressed ? Mic : MicOff;
  const CameraIcon = camera.pressed ? Video : VideoOff;
  const ExpandedViewIcon = expandedView.pressed ? Minimize2 : Maximize2;
  const TranslationIcon = translation.pressed ? Globe : GlobeOff;
  const microphoneLabel = t(microphone.labelKey);
  const microphoneStatus = t(microphone.statusKey);
  const cameraLabel = t(camera.labelKey);
  const cameraStatus = t(camera.statusKey);
  const expandedViewLabel = t(expandedView.labelKey);
  const expandedViewStatus = t(expandedView.statusKey);
  const translationLabel = t(translation.labelKey);
  const translationStatus = t(translation.statusKey);

  return (
    <div aria-label={t("meetingControls.toolbarAriaLabel")} className="meeting-control-bar" role="toolbar">
      <button
        aria-label={`${microphoneLabel}. ${microphoneStatus}`}
        aria-pressed={microphone.pressed}
        className={getControlButtonClassName({
          isOff: !microphone.pressed,
          isUpdating: isMicrophoneUpdating
        })}
        disabled={microphone.disabled}
        onClick={onMicrophoneToggle}
        title={microphoneStatus}
        type="button"
      >
        <ControlIcon icon={MicrophoneIcon} />
      </button>
      <button
        aria-label={`${cameraLabel}. ${cameraStatus}`}
        aria-pressed={camera.pressed}
        className={getControlButtonClassName({
          isOff: !camera.pressed,
          isUpdating: isCameraUpdating
        })}
        disabled={camera.disabled}
        onClick={onCameraToggle}
        title={cameraStatus}
        type="button"
      >
        <ControlIcon icon={CameraIcon} />
      </button>
      <button
        aria-label={`${expandedViewLabel}. ${expandedViewStatus}`}
        aria-pressed={expandedView.pressed}
        className={getControlButtonClassName({
          isActive: expandedView.pressed,
          isOff: false,
          isUpdating: false
        })}
        disabled={expandedView.disabled}
        onClick={onExpandedViewToggle}
        title={expandedViewStatus}
        type="button"
      >
        <ControlIcon icon={ExpandedViewIcon} />
      </button>
      <button
        aria-label={`${translationLabel}. ${translationStatus}`}
        aria-pressed={translation.pressed}
        className={getControlButtonClassName({
          isOff: !translation.pressed,
          isUpdating: translation.disabled
        })}
        disabled={translation.disabled}
        onClick={onTranslationToggle}
        title={translationStatus}
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
