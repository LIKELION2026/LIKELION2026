import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const SMOKE_ENV = {
  ...process.env,
  LIVEKIT_API_KEY: "test-api-key",
  LIVEKIT_API_SECRET: "test-api-secret",
  LIVEKIT_ROOM_SMOKE_ROOM_NAME: "lab-likelion-20260816-cloud",
  LIVEKIT_URL: "wss://example.livekit.cloud"
};

test("livekit room smoke dry-run converts the LiveKit websocket URL to the API host", () => {
  const result = runSmokeDryRun({
    ...SMOKE_ENV,
    LIVEKIT_ROOM_SMOKE_SERVER_BASE_URL: "https://server.example.com/base"
  });

  assert.equal(result.status, 0);
  assert.match(
    result.stdout,
    /"liveKitApiHost": "https:\/\/example.livekit.cloud"/
  );
  assert.match(
    result.stdout,
    /"roomStateUrl": "https:\/\/server.example.com\/base\/meeting\/rooms\/lab-likelion-20260816-cloud\/state"/
  );
});

test("livekit room smoke rejects non-local http server base URLs", () => {
  const result = runSmokeDryRun({
    ...SMOKE_ENV,
    LIVEKIT_ROOM_SMOKE_SERVER_BASE_URL: "http://example.com"
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /LIVEKIT_ROOM_SMOKE_SERVER_BASE_URL must use https outside localhost/
  );
});

test("livekit room smoke rejects room names outside the lab policy", () => {
  const result = runSmokeDryRun({
    ...SMOKE_ENV,
    LIVEKIT_ROOM_SMOKE_ROOM_NAME: "prod-room"
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /LIVEKIT_ROOM_SMOKE_ROOM_NAME must use lab-<team>-<yyyymmdd>-<slug>/
  );
});

function runSmokeDryRun(env: NodeJS.ProcessEnv): {
  status: number | null;
  stderr: string;
  stdout: string;
} {
  const result = spawnSync(
    process.execPath,
    ["-r", "ts-node/register", "scripts/livekit-room-smoke.ts", "--dry-run"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env
    }
  );

  return {
    status: result.status,
    stderr: result.stderr,
    stdout: result.stdout
  };
}
