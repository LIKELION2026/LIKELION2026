import assert from "node:assert/strict";
import test from "node:test";

import { getMeetingPresenceAction } from "../src/features/virtual-office/model/meeting-presence-transition.ts";

test("applies the meeting status only after LiveKit connects", () => {
  assert.equal(
    getMeetingPresenceAction({ isApplied: false, sessionStatus: "connected" }),
    "apply"
  );
  assert.equal(
    getMeetingPresenceAction({ isApplied: false, sessionStatus: "connecting" }),
    "none"
  );
});

test("keeps the meeting status through a LiveKit reconnection and restores it after leaving", () => {
  assert.equal(
    getMeetingPresenceAction({ isApplied: true, sessionStatus: "reconnecting" }),
    "none"
  );
  assert.equal(
    getMeetingPresenceAction({ isApplied: true, sessionStatus: "disconnected" }),
    "restore"
  );
});
