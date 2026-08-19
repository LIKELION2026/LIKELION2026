import assert from "node:assert/strict";
import test from "node:test";

import {
  getMeetingSessionControllerTransition,
  isMeetingSessionActive,
  isMeetingSessionStartInFlight
} from "../src/features/realtime-meeting/model/meeting-session-transition.ts";

test("starts permission and connection only from an enter edge", () => {
  assert.equal(
    getMeetingSessionControllerTransition("idle", "enter"),
    "requesting-permission"
  );
  assert.equal(
    getMeetingSessionControllerTransition(
      "requesting-permission",
      "permission-ready"
    ),
    "connecting"
  );
  assert.equal(
    getMeetingSessionControllerTransition("connecting", "connected"),
    "connected"
  );
  assert.equal(
    getMeetingSessionControllerTransition("connected", "enter"),
    "connected"
  );
});

test("leaves from pending or connected states and restores idle after cleanup", () => {
  assert.equal(
    getMeetingSessionControllerTransition("connecting", "leave"),
    "leaving"
  );
  assert.equal(
    getMeetingSessionControllerTransition("connected", "leave"),
    "leaving"
  );
  assert.equal(
    getMeetingSessionControllerTransition("leaving", "left"),
    "idle"
  );
});

test("allows retry only after a failed attempt", () => {
  assert.equal(
    getMeetingSessionControllerTransition("failed", "retry"),
    "requesting-permission"
  );
  assert.equal(
    getMeetingSessionControllerTransition("connected", "retry"),
    "connected"
  );
});

test("classifies in-flight and active session states", () => {
  assert.equal(isMeetingSessionStartInFlight("requesting-permission"), true);
  assert.equal(isMeetingSessionStartInFlight("connected"), false);
  assert.equal(isMeetingSessionActive("requesting-permission"), true);
  assert.equal(isMeetingSessionActive("connecting"), true);
  assert.equal(isMeetingSessionActive("connected"), true);
  assert.equal(isMeetingSessionActive("failed"), false);
});
