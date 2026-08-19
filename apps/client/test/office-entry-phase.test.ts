import assert from "node:assert/strict";
import test from "node:test";

import { getOfficeEntryPhase } from "../src/features/virtual-office/model/office-entry-phase.ts";

test("keeps the stored-profile restore path on the loading screen", () => {
  assert.equal(
    getOfficeEntryPhase({
      hasSession: false,
      isPreparingSession: true,
      isRestoringStoredSession: true,
      isSceneReady: false,
    }),
    "loading",
  );
});

test("shows onboarding only after a failed or absent session restore", () => {
  assert.equal(
    getOfficeEntryPhase({
      hasSession: false,
      isPreparingSession: false,
      isRestoringStoredSession: false,
      isSceneReady: false,
    }),
    "onboarding",
  );
});

test("keeps loading visible until Phaser finishes preparing the office", () => {
  assert.equal(
    getOfficeEntryPhase({
      hasSession: true,
      isPreparingSession: false,
      isRestoringStoredSession: false,
      isSceneReady: false,
    }),
    "loading",
  );
});

test("shows the office after the session and scene are both ready", () => {
  assert.equal(
    getOfficeEntryPhase({
      hasSession: true,
      isPreparingSession: false,
      isRestoringStoredSession: false,
      isSceneReady: true,
    }),
    "office",
  );
});
