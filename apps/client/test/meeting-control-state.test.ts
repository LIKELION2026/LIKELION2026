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
      label: "소리 끄기",
      pressed: true,
      statusText: "마이크 켜짐"
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
      label: "소리 변경 중",
      pressed: false,
      statusText: "마이크 꺼짐"
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
      label: "영상 켜기",
      pressed: false,
      statusText: "카메라 꺼짐"
    }
  );
});

test("expand view control toggles the in-overlay grid mode", () => {
  assert.deepEqual(createExpandViewControlState(false), {
    disabled: false,
    label: "화면 키우기",
    pressed: false,
    statusText: "일반 화면"
  });

  assert.deepEqual(createExpandViewControlState(true), {
    disabled: false,
    label: "화면 줄이기",
    pressed: true,
    statusText: "확대 화면 켜짐"
  });
});

test("translation control exposes a future integration-friendly on/off state", () => {
  assert.deepEqual(createTranslationControlState(false), {
    disabled: false,
    label: "AI 번역 ON",
    pressed: false,
    statusText: "번역 꺼짐"
  });

  assert.deepEqual(createTranslationControlState(true), {
    disabled: false,
    label: "AI 번역 OFF",
    pressed: true,
    statusText: "번역 켜짐"
  });

  assert.deepEqual(createTranslationControlState(false, false, true), {
    disabled: true,
    label: "AI 번역 ON",
    pressed: false,
    statusText: "회의 연결 후 AI 번역 설정 가능"
  });

  assert.deepEqual(createTranslationControlState(true, true), {
    disabled: true,
    label: "AI 번역 변경 중",
    pressed: true,
    statusText: "번역 켜짐"
  });
});
