import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { RoomServiceClient } from "livekit-server-sdk";

const SERVER_ROOT = resolve(__dirname, "..");
const WORKSPACE_ROOT = resolve(SERVER_ROOT, "../..");
const LAB_MEETING_ROOM_NAME_PATTERN =
  /^lab-[a-zA-Z0-9][a-zA-Z0-9_-]{1,23}-[0-9]{8}-[a-zA-Z0-9][a-zA-Z0-9_-]{1,23}$/;
const DEFAULT_EMPTY_TIMEOUT_SECONDS = 60;
const DEFAULT_DEPARTURE_TIMEOUT_SECONDS = 5;
const DEFAULT_MAX_PARTICIPANTS = 2;
const DEFAULT_POLL_INTERVAL_MS = 1_000;
const DEFAULT_TIMEOUT_MS = 30_000;

interface LiveKitRoomSmokeOptions {
  departureTimeoutSeconds: number;
  dryRun: boolean;
  emptyTimeoutSeconds: number;
  liveKitApiHost: string;
  maxParticipants: number;
  pollIntervalMs: number;
  roomName: string;
  roomStateUrl: string;
  serverBaseUrl: string;
  timeoutMs: number;
}

interface MeetingRoomStateResponse {
  lastEvent: string;
  participantCount: number;
  roomName: string;
  status: "active" | "finished";
  trackCount: number;
}

void main();

async function main(): Promise<void> {
  try {
    loadEnvFiles();

    const options = resolveSmokeOptions();

    if (options.dryRun) {
      printDryRun(options);

      return;
    }

    await runLiveKitRoomSmoke(options);
  } catch (error) {
    process.exitCode = 1;
    console.error(error instanceof Error ? error.message : String(error));
  }
}

async function runLiveKitRoomSmoke(
  options: LiveKitRoomSmokeOptions
): Promise<void> {
  const roomService = new RoomServiceClient(
    options.liveKitApiHost,
    requireEnv("LIVEKIT_API_KEY"),
    requireEnv("LIVEKIT_API_SECRET")
  );
  let shouldCleanupRoom = false;

  try {
    const room = await roomService.createRoom({
      departureTimeout: options.departureTimeoutSeconds,
      emptyTimeout: options.emptyTimeoutSeconds,
      maxParticipants: options.maxParticipants,
      metadata: JSON.stringify({
        purpose: "livekit-room-smoke",
        source: "likelion2026-server"
      }),
      name: options.roomName
    });
    shouldCleanupRoom = true;

    printResponse("livekit room created", {
      roomName: room.name,
      roomSid: room.sid
    });

    const startedState = await waitForRoomState(
      options,
      (state) => state.lastEvent === "room_started" && state.status === "active",
      "room_started"
    );
    printResponse("room_started webhook", startedState);

    await roomService.deleteRoom(options.roomName);
    shouldCleanupRoom = false;
    printResponse("livekit room deleted", {
      roomName: options.roomName
    });

    const finishedState = await waitForRoomState(
      options,
      (state) =>
        state.lastEvent === "room_finished" && state.status === "finished",
      "room_finished"
    );
    printResponse("room_finished webhook", finishedState);
  } finally {
    if (shouldCleanupRoom) {
      await cleanupRoom(roomService, options.roomName);
    }
  }
}

async function cleanupRoom(
  roomService: RoomServiceClient,
  roomName: string
): Promise<void> {
  try {
    await roomService.deleteRoom(roomName);
    printResponse("livekit room cleanup", { roomName });
  } catch (error) {
    console.error(
      `LiveKit room cleanup failed for ${roomName}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

async function waitForRoomState(
  options: LiveKitRoomSmokeOptions,
  predicate: (state: MeetingRoomStateResponse) => boolean,
  expectedEvent: string
): Promise<MeetingRoomStateResponse> {
  const deadline = Date.now() + options.timeoutMs;
  let lastResult = "no response yet";

  while (Date.now() <= deadline) {
    try {
      const state = await getRoomState(options.roomStateUrl);
      lastResult = `${state.lastEvent}/${state.status}`;

      if (predicate(state)) {
        return state;
      }
    } catch (error) {
      lastResult = error instanceof Error ? error.message : String(error);
    }

    await delay(options.pollIntervalMs);
  }

  throw new Error(
    `Timed out waiting for ${expectedEvent} at ${options.roomStateUrl}. Last result: ${lastResult}. Ensure LiveKit Cloud webhook points to /meeting/livekit/webhook on the running server and that the tunnel is alive.`
  );
}

async function getRoomState(
  roomStateUrl: string
): Promise<MeetingRoomStateResponse> {
  const response = await fetch(roomStateUrl);
  const responseBody = await response.text();

  if (!response.ok) {
    throw new Error(
      `room state request failed: ${response.status} ${response.statusText} ${responseBody}`
    );
  }

  const parsedBody = responseBody ? JSON.parse(responseBody) : undefined;

  if (!isMeetingRoomStateResponse(parsedBody)) {
    throw new Error("room state response must be a valid JSON object");
  }

  return parsedBody;
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

function resolveSmokeOptions(): LiveKitRoomSmokeOptions {
  const serverBaseUrl = normalizeServerBaseUrl(
    process.env.LIVEKIT_ROOM_SMOKE_SERVER_BASE_URL?.trim() ??
      `http://localhost:${process.env.PORT?.trim() || "4000"}`
  );
  const roomName =
    process.env.LIVEKIT_ROOM_SMOKE_ROOM_NAME?.trim() ??
    createDefaultRoomName();

  assertLabRoomName(roomName);

  return {
    departureTimeoutSeconds: readPositiveIntegerEnv(
      "LIVEKIT_ROOM_SMOKE_DEPARTURE_TIMEOUT_SECONDS",
      DEFAULT_DEPARTURE_TIMEOUT_SECONDS
    ),
    dryRun: process.argv.includes("--dry-run"),
    emptyTimeoutSeconds: readPositiveIntegerEnv(
      "LIVEKIT_ROOM_SMOKE_EMPTY_TIMEOUT_SECONDS",
      DEFAULT_EMPTY_TIMEOUT_SECONDS
    ),
    liveKitApiHost: normalizeLiveKitApiHost(requireEnv("LIVEKIT_URL")),
    maxParticipants: readPositiveIntegerEnv(
      "LIVEKIT_ROOM_SMOKE_MAX_PARTICIPANTS",
      DEFAULT_MAX_PARTICIPANTS
    ),
    pollIntervalMs: readPositiveIntegerEnv(
      "LIVEKIT_ROOM_SMOKE_POLL_INTERVAL_MS",
      DEFAULT_POLL_INTERVAL_MS
    ),
    roomName,
    roomStateUrl: createRoomStateUrl(serverBaseUrl, roomName),
    serverBaseUrl,
    timeoutMs: readPositiveIntegerEnv(
      "LIVEKIT_ROOM_SMOKE_TIMEOUT_MS",
      DEFAULT_TIMEOUT_MS
    )
  };
}

function normalizeLiveKitApiHost(liveKitUrl: string): string {
  const url = parseUrl(liveKitUrl, "LIVEKIT_URL");

  if (url.protocol === "wss:") {
    url.protocol = "https:";
  } else if (url.protocol === "ws:") {
    url.protocol = "http:";
  } else if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("LIVEKIT_URL must use wss, ws, https, or http");
  }

  if (url.protocol !== "https:" && !isLocalhostUrl(url)) {
    throw new Error("LIVEKIT_URL must resolve to https outside localhost");
  }

  url.pathname = "/";
  url.search = "";
  url.hash = "";

  return stripTrailingSlash(url.toString());
}

function normalizeServerBaseUrl(serverBaseUrl: string): string {
  const url = parseUrl(
    serverBaseUrl,
    "LIVEKIT_ROOM_SMOKE_SERVER_BASE_URL"
  );

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(
      "LIVEKIT_ROOM_SMOKE_SERVER_BASE_URL must use http or https"
    );
  }

  if (url.protocol !== "https:" && !isLocalhostUrl(url)) {
    throw new Error(
      "LIVEKIT_ROOM_SMOKE_SERVER_BASE_URL must use https outside localhost"
    );
  }

  url.search = "";
  url.hash = "";

  return stripTrailingSlash(url.toString());
}

function createRoomStateUrl(serverBaseUrl: string, roomName: string): string {
  const url = new URL(serverBaseUrl);
  const basePath = url.pathname.replace(/\/+$/, "");

  url.pathname = `${basePath}/meeting/rooms/${encodeURIComponent(
    roomName
  )}/state`;

  return url.toString();
}

function parseUrl(value: string, name: string): URL {
  try {
    return new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }
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

function createDefaultRoomName(): string {
  const yyyymmdd = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = randomUUID().replaceAll("-", "").slice(0, 8);

  return `lab-likelion-${yyyymmdd}-cloud${suffix}`;
}

function assertLabRoomName(roomName: string): void {
  if (!LAB_MEETING_ROOM_NAME_PATTERN.test(roomName)) {
    throw new Error(
      "LIVEKIT_ROOM_SMOKE_ROOM_NAME must use lab-<team>-<yyyymmdd>-<slug>"
    );
  }
}

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const rawValue = process.env[name]?.trim();

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsedValue;
}

function isMeetingRoomStateResponse(
  value: unknown
): value is MeetingRoomStateResponse {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.lastEvent === "string" &&
    typeof value.participantCount === "number" &&
    typeof value.roomName === "string" &&
    (value.status === "active" || value.status === "finished") &&
    typeof value.trackCount === "number"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function delay(durationMs: number): Promise<void> {
  return new Promise((resolveDelay) => {
    setTimeout(resolveDelay, durationMs);
  });
}

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function printDryRun(options: LiveKitRoomSmokeOptions): void {
  console.log(
    JSON.stringify(
      {
        createRoom: {
          departureTimeout: options.departureTimeoutSeconds,
          emptyTimeout: options.emptyTimeoutSeconds,
          maxParticipants: options.maxParticipants,
          name: options.roomName
        },
        dryRun: true,
        liveKitApiHost: options.liveKitApiHost,
        pollIntervalMs: options.pollIntervalMs,
        roomName: options.roomName,
        roomStateUrl: options.roomStateUrl,
        serverBaseUrl: options.serverBaseUrl,
        timeoutMs: options.timeoutMs
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

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
