import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const SMOKE_ENV = {
  ...process.env,
  MEETING_SUBTITLE_SMOKE_ROOM_NAME: "lab-likelion-20260816-meeting-room",
  MEETING_SUBTITLE_SMOKE_SUBTITLE_ID: "smoke-subtitle"
};

test("meeting subtitle smoke dry-run prints mock endpoints and revisions", () => {
  const result = runSmokeDryRun({
    ...SMOKE_ENV,
    MEETING_SUBTITLE_SMOKE_SERVER_BASE_URL: "https://server.example.com/base"
  });

  assert.equal(result.status, 0);
  assert.match(
    result.stdout,
    /"mockSubtitleUrl": "https:\/\/server.example.com\/base\/meeting\/subtitles\/mock"/
  );
  assert.match(
    result.stdout,
    /"subtitleListUrl": "https:\/\/server.example.com\/base\/meeting\/rooms\/lab-likelion-20260816-meeting-room\/subtitles"/
  );
  assert.match(result.stdout, /"revision": 1/);
  assert.match(result.stdout, /"revision": 2/);
});

test("meeting subtitle smoke rejects non-local http server base URLs", () => {
  const result = runSmokeDryRun({
    ...SMOKE_ENV,
    MEETING_SUBTITLE_SMOKE_SERVER_BASE_URL: "http://example.com"
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /MEETING_SUBTITLE_SMOKE_SERVER_BASE_URL must use https outside localhost/
  );
});

test("meeting subtitle smoke rejects room names outside the lab policy", () => {
  const result = runSmokeDryRun({
    ...SMOKE_ENV,
    MEETING_SUBTITLE_SMOKE_ROOM_NAME: "prod-room"
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /MEETING_SUBTITLE_SMOKE_ROOM_NAME must use lab-<team>-<yyyymmdd>-<slug>/
  );
});

function runSmokeDryRun(env: NodeJS.ProcessEnv): {
  status: number | null;
  stderr: string;
  stdout: string;
} {
  const result = spawnSync(
    process.execPath,
    ["-r", "ts-node/register", "scripts/meeting-subtitle-smoke.ts", "--dry-run"],
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
