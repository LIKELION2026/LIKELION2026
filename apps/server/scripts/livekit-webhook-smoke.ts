import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { AccessToken } from "livekit-server-sdk";

const SERVER_ROOT = resolve(__dirname, "..");
const WORKSPACE_ROOT = resolve(SERVER_ROOT, "../..");
const WEBHOOK_CONTENT_TYPE = "application/webhook+json";

interface SmokeOptions {
  dryRun: boolean;
  repeatDuplicate: boolean;
  targetUrl: string;
}

interface SmokeWebhookBody {
  event: "participant_joined";
  id: string;
  participant: {
    identity: string;
    name: string;
    sid: string;
  };
  room: {
    name: string;
    sid: string;
  };
}

void main();

async function main(): Promise<void> {
  try {
    loadEnvFiles();

    const options = resolveSmokeOptions();
    const smokeBody = createSmokeWebhookBody();
    const body = JSON.stringify(smokeBody);
    const authorizationHeader = await createWebhookAuthorizationHeader(body);
    const roomStateUrl = createRoomStateUrl(
      options.targetUrl,
      smokeBody.room.name
    );

    if (options.dryRun) {
      printDryRun(options, body, roomStateUrl);

      return;
    }

    const firstResponse = await postWebhook(
      options.targetUrl,
      body,
      authorizationHeader
    );

    assertWebhookAck(firstResponse, false, "first webhook");
    printResponse("first webhook", firstResponse);

    if (options.repeatDuplicate) {
      const duplicateResponse = await postWebhook(
        options.targetUrl,
        body,
        authorizationHeader
      );

      assertWebhookAck(duplicateResponse, true, "duplicate webhook");
      printResponse("duplicate webhook", duplicateResponse);
    }

    const roomStateResponse = await getRoomState(roomStateUrl);
    assertRoomState(
      roomStateResponse,
      smokeBody.room.name,
      smokeBody.participant.identity
    );
    printResponse("room state", roomStateResponse);
  } catch (error) {
    process.exitCode = 1;
    console.error(error instanceof Error ? error.message : String(error));
  }
}

function loadEnvFiles(): void {
  const envFilePaths = [
    resolve(SERVER_ROOT, ".env.local"),
    resolve(SERVER_ROOT, ".env"),
    resolve(WORKSPACE_ROOT, ".env.local"),
    resolve(WORKSPACE_ROOT, ".env")
  ];

  for (const envFilePath of envFilePaths) {
    if (!existsSync(envFilePath)) {
      continue;
    }

    for (const line of readFileSync(envFilePath, "utf8").split(/\r?\n/)) {
      const parsedLine = parseEnvLine(line);

      if (!parsedLine) {
        continue;
      }

      const [key, value] = parsedLine;
      process.env[key] ??= value;
    }
  }
}

function parseEnvLine(line: string): [string, string] | undefined {
  const normalizedLine = line.trim();

  if (!normalizedLine || normalizedLine.startsWith("#")) {
    return undefined;
  }

  const assignment = normalizedLine.startsWith("export ")
    ? normalizedLine.slice("export ".length).trim()
    : normalizedLine;
  const separatorIndex = assignment.indexOf("=");

  if (separatorIndex <= 0) {
    return undefined;
  }

  const key = assignment.slice(0, separatorIndex).trim();
  const rawValue = assignment.slice(separatorIndex + 1).trim();

  if (!/^[A-Z0-9_]+$/i.test(key)) {
    return undefined;
  }

  return [key, stripMatchingQuotes(rawValue)];
}

function stripMatchingQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function resolveSmokeOptions(): SmokeOptions {
  const targetUrl =
    process.env.LIVEKIT_WEBHOOK_SMOKE_URL?.trim() ??
    `http://localhost:${process.env.PORT?.trim() || "4000"}/meeting/livekit/webhook`;

  return {
    dryRun: process.argv.includes("--dry-run"),
    repeatDuplicate:
      process.env.LIVEKIT_WEBHOOK_SMOKE_DUPLICATE?.trim() !== "false",
    targetUrl: normalizeSmokeTargetUrl(targetUrl)
  };
}

function normalizeSmokeTargetUrl(targetUrl: string): string {
  let url: URL;

  try {
    url = new URL(targetUrl);
  } catch {
    throw new Error("LIVEKIT_WEBHOOK_SMOKE_URL must be a valid URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("LIVEKIT_WEBHOOK_SMOKE_URL must use http or https");
  }

  if (url.protocol !== "https:" && !isLocalhostUrl(url)) {
    throw new Error(
      "LIVEKIT_WEBHOOK_SMOKE_URL must use https outside localhost"
    );
  }

  return url.toString();
}

function isLocalhostUrl(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".localhost")
  );
}

function createRoomStateUrl(webhookUrl: string, roomName: string): string {
  const url = new URL(webhookUrl);
  const webhookPath = "/meeting/livekit/webhook";
  const encodedRoomName = encodeURIComponent(roomName);

  if (url.pathname.endsWith(webhookPath)) {
    const basePath = url.pathname.slice(0, -webhookPath.length);
    url.pathname = `${basePath}/meeting/rooms/${encodedRoomName}/state`;
  } else {
    url.pathname = `/meeting/rooms/${encodedRoomName}/state`;
  }

  url.search = "";

  return url.toString();
}

function createSmokeWebhookBody(): SmokeWebhookBody {
  const yyyymmdd = new Date().toISOString().slice(0, 10).replaceAll("-", "");

  return {
    event: "participant_joined",
    id: `EV_smoke_${randomUUID()}`,
    participant: {
      identity:
        process.env.LIVEKIT_WEBHOOK_SMOKE_PARTICIPANT_IDENTITY?.trim() ??
        "smoke-tester",
      name:
        process.env.LIVEKIT_WEBHOOK_SMOKE_PARTICIPANT_NAME?.trim() ??
        "Smoke Tester",
      sid: `PA_smoke_${randomUUID()}`
    },
    room: {
      name:
        process.env.LIVEKIT_WEBHOOK_SMOKE_ROOM_NAME?.trim() ??
        `lab-likelion-${yyyymmdd}-smoke`,
      sid: `RM_smoke_${randomUUID()}`
    }
  };
}

async function createWebhookAuthorizationHeader(body: string): Promise<string> {
  const token = new AccessToken(
    requireEnv("LIVEKIT_API_KEY"),
    requireEnv("LIVEKIT_API_SECRET"),
    {
      ttl: "5m"
    }
  );
  token.sha256 = createHash("sha256").update(body).digest("base64");

  return token.toJwt();
}

async function postWebhook(
  targetUrl: string,
  body: string,
  authorizationHeader: string
): Promise<unknown> {
  const response = await fetch(targetUrl, {
    body,
    headers: {
      Authorization: authorizationHeader,
      "Content-Type": WEBHOOK_CONTENT_TYPE
    },
    method: "POST"
  });
  const responseBody = await response.text();

  if (!response.ok) {
    throw new Error(
      `LiveKit webhook smoke failed: ${response.status} ${response.statusText} ${responseBody}`
    );
  }

  return responseBody ? JSON.parse(responseBody) : undefined;
}

async function getRoomState(roomStateUrl: string): Promise<unknown> {
  const response = await fetch(roomStateUrl);
  const responseBody = await response.text();

  if (!response.ok) {
    throw new Error(
      `LiveKit room state smoke failed: ${response.status} ${response.statusText} ${responseBody}`
    );
  }

  return responseBody ? JSON.parse(responseBody) : undefined;
}

function assertWebhookAck(
  response: unknown,
  expectedDuplicate: boolean,
  label: string
): void {
  if (!isRecord(response)) {
    throw new Error(`${label} response must be a JSON object`);
  }

  if (response.received !== true) {
    throw new Error(`${label} response did not acknowledge the webhook`);
  }

  if (response.duplicate !== expectedDuplicate) {
    throw new Error(
      `${label} duplicate flag expected ${expectedDuplicate}, got ${String(
        response.duplicate
      )}`
    );
  }
}

function assertRoomState(
  response: unknown,
  roomName: string,
  participantIdentity: string
): void {
  if (!isRecord(response)) {
    throw new Error("room state response must be a JSON object");
  }

  if (response.roomName !== roomName) {
    throw new Error(
      `room state roomName expected ${roomName}, got ${String(
        response.roomName
      )}`
    );
  }

  if (response.participantCount !== 1) {
    throw new Error(
      `room state participantCount expected 1, got ${String(
        response.participantCount
      )}`
    );
  }

  if (!Array.isArray(response.participants)) {
    throw new Error("room state participants must be an array");
  }

  const hasSmokeParticipant = response.participants.some(
    (participant) =>
      isRecord(participant) &&
      participant.participantIdentity === participantIdentity
  );

  if (!hasSmokeParticipant) {
    throw new Error(
      `room state did not include participant ${participantIdentity}`
    );
  }
}

function printDryRun(
  options: SmokeOptions,
  body: string,
  roomStateUrl: string
): void {
  console.log(
    JSON.stringify(
      {
        authorizationHeader: "<redacted>",
        body: JSON.parse(body),
        contentType: WEBHOOK_CONTENT_TYPE,
        dryRun: true,
        roomStateUrl,
        targetUrl: options.targetUrl
      },
      null,
      2
    )
  );
}

function printResponse(label: string, response: unknown): void {
  console.log(
    JSON.stringify(
      {
        label,
        response
      },
      null,
      2
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
