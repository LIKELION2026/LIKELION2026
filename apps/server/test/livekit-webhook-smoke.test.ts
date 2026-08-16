import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const SMOKE_ENV = {
  ...process.env,
  LIVEKIT_API_KEY: "test-api-key",
  LIVEKIT_API_SECRET: "test-api-secret",
  LIVEKIT_URL: "wss://example.livekit.cloud"
};

test("livekit webhook smoke dry-run allows localhost http targets", () => {
  const result = runSmokeDryRun({
    ...SMOKE_ENV,
    LIVEKIT_WEBHOOK_SMOKE_URL:
      "http://localhost:4000/meeting/livekit/webhook"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /"targetUrl": "http:\/\/localhost:4000\/meeting\/livekit\/webhook"/);
});

test("livekit webhook smoke rejects non-local http targets", () => {
  const result = runSmokeDryRun({
    ...SMOKE_ENV,
    LIVEKIT_WEBHOOK_SMOKE_URL: "http://example.com/meeting/livekit/webhook"
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /LIVEKIT_WEBHOOK_SMOKE_URL must use https outside localhost/
  );
});

function runSmokeDryRun(env: NodeJS.ProcessEnv): {
  status: number | null;
  stderr: string;
  stdout: string;
} {
  const result = spawnSync(
    process.execPath,
    ["-r", "ts-node/register", "scripts/livekit-webhook-smoke.ts", "--dry-run"],
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
