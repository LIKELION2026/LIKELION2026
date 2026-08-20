import assert from "node:assert/strict";
import test from "node:test";

import {
  createCameraControlState,
  createExpandViewControlState,
  createMicrophoneControlState,
  createTranslationControlState
} from "../src/features/realtime-meeting/model/meeting-control-state.ts";

test("microphone control mirrors enabled, disabled, and updating states", () => {
  assert.deepEqual(
    createMicrophoneControlState({
      canControlMedia: true,
      isEnabled: true,
      isLeaving: false,
      isUpdating: false
    }),
    {
      disabled: false,
      labelKey: "meetingControls.microphone.disable",
      pressed: true,
      statusKey: "meetingControls.microphone.enabled"
    }
  );

  assert.deepEqual(
    createMicrophoneControlState({
      canControlMedia: true,
      isEnabled: false,
      isLeaving: false,
      isUpdating: true
    }),
    {
      disabled: true,
      labelKey: "meetingControls.microphone.updating",
      pressed: false,
      statusKey: "meetingControls.microphone.disabled"
    }
  );
});

test("camera control disables while leaving the meeting room", () => {
  assert.deepEqual(
    createCameraControlState({
      canControlMedia: true,
      isEnabled: false,
      isLeaving: true,
      isUpdating: false
    }),
    {
      disabled: true,
      labelKey: "meetingControls.camera.enable",
      pressed: false,
      statusKey: "meetingControls.camera.disabled"
    }
  );
});

test("expand view control toggles the in-overlay grid mode", () => {
  assert.deepEqual(createExpandViewControlState(false), {
    disabled: false,
    labelKey: "meetingControls.expandedView.expand",
    pressed: false,
    statusKey: "meetingControls.expandedView.normal"
  });

  assert.deepEqual(createExpandViewControlState(true), {
    disabled: false,
    labelKey: "meetingControls.expandedView.collapse",
    pressed: true,
    statusKey: "meetingControls.expandedView.expanded"
  });
});

test("translation control exposes a future integration-friendly on/off state", () => {
  assert.deepEqual(createTranslationControlState(false), {
    disabled: false,
    labelKey: "meetingControls.translation.enable",
    pressed: false,
    statusKey: "meetingControls.translation.disabled"
  });

  assert.deepEqual(createTranslationControlState(true), {
    disabled: false,
    labelKey: "meetingControls.translation.disable",
    pressed: true,
    statusKey: "meetingControls.translation.enabled"
  });

  assert.deepEqual(createTranslationControlState(false, false, true), {
    disabled: true,
    labelKey: "meetingControls.translation.enable",
    pressed: false,
    statusKey: "meetingControls.translation.unavailable"
  });

  assert.deepEqual(createTranslationControlState(true, true), {
    disabled: true,
    labelKey: "meetingControls.translation.updating",
    pressed: true,
    statusKey: "meetingControls.translation.enabled"
  });
});
