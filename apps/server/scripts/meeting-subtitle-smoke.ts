import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const SERVER_ROOT = resolve(__dirname, "..");
const WORKSPACE_ROOT = resolve(SERVER_ROOT, "../..");
const LAB_MEETING_ROOM_NAME_PATTERN =
  /^lab-[a-zA-Z0-9][a-zA-Z0-9_-]{1,23}-[0-9]{8}-[a-zA-Z0-9][a-zA-Z0-9_-]{1,23}$/;
const SUBTITLE_CREATED_EVENT = "subtitle.created";
const SUBTITLE_UPDATE_STRATEGY = "replace-by-subtitle-id";

interface MeetingSubtitleSmokeOptions {
  displayName: string;
  dryRun: boolean;
  mockSubtitleUrl: string;
  participantIdentity: string;
  roomName: string;
  serverBaseUrl: string;
  subtitleId: string;
  subtitleListUrl: string;
}

interface MockSubtitleRequest {
  isFinal: boolean;
  revision: number;
  roomName: string;
  sourceLanguage: "ko";
  sourceText: string;
  speaker: {
    displayName: string;
    participantIdentity: string;
  };
  subtitleId: string;
  translatedLanguage: "vi";
  translatedText: string;
}

interface MockSubtitleResponse {
  eventName: typeof SUBTITLE_CREATED_EVENT;
  payload: MockSubtitleRequest & {
    confidence?: number;
    occurredAt: string;
  };
}

interface ListMockSubtitlesResponse {
  eventName: typeof SUBTITLE_CREATED_EVENT;
  payloads: Array<MockSubtitleResponse["payload"]>;
  roomName: string;
  updateStrategy: typeof SUBTITLE_UPDATE_STRATEGY;
}

void main();

async function main(): Promise<void> {
  try {
    loadEnvFiles();

    const options = resolveSmokeOptions();
    const partialRequest = createMockSubtitleRequest(options, {
      isFinal: false,
      revision: 1,
      sourceText: "\uC774\uBC88 \uBC30\uD3EC\uB294",
      translatedText: "Ban phat hanh nay"
    });
    const finalRequest = createMockSubtitleRequest(options, {
      isFinal: true,
      revision: 2,
      sourceText:
        "\uC774\uBC88 \uBC30\uD3EC\uB294 \uAE08\uC694\uC77C\uC785\uB2C8\uB2E4.",
      translatedText: "Ban phat hanh nay vao thu Sau."
    });

    if (options.dryRun) {
      printDryRun(options, partialRequest, finalRequest);

      return;
    }

    const partialResponse = await postMockSubtitle(
      options.mockSubtitleUrl,
      partialRequest
    );
    assertMockSubtitleResponse(partialResponse, partialRequest, "partial");
    printResponse("mock subtitle partial", partialResponse);

    const finalResponse = await postMockSubtitle(
      options.mockSubtitleUrl,
      finalRequest
    );
    assertMockSubtitleResponse(finalResponse, finalRequest, "final");
    printResponse("mock subtitle final", finalResponse);

    const listResponse = await getMockSubtitles(options.subtitleListUrl);
    assertLatestSubtitle(listResponse, finalRequest);
    printResponse("mock subtitle buffer", listResponse);
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

function resolveSmokeOptions(): MeetingSubtitleSmokeOptions {
  const serverBaseUrl = normalizeServerBaseUrl(
    process.env.MEETING_SUBTITLE_SMOKE_SERVER_BASE_URL?.trim() ??
      `http://localhost:${process.env.PORT?.trim() || "4000"}`
  );
  const roomName =
    process.env.MEETING_SUBTITLE_SMOKE_ROOM_NAME?.trim() ??
    createDefaultRoomName();
  const subtitleId =
    process.env.MEETING_SUBTITLE_SMOKE_SUBTITLE_ID?.trim() ??
    createDefaultSubtitleId();

  assertLabRoomName(roomName);

  return {
    displayName:
      process.env.MEETING_SUBTITLE_SMOKE_DISPLAY_NAME?.trim() ??
      "Smoke Tester",
    dryRun: process.argv.includes("--dry-run"),
    mockSubtitleUrl: createMockSubtitleUrl(serverBaseUrl),
    participantIdentity:
      process.env.MEETING_SUBTITLE_SMOKE_PARTICIPANT_IDENTITY?.trim() ??
      "kr-guest-smoke",
    roomName,
    serverBaseUrl,
    subtitleId,
    subtitleListUrl: createSubtitleListUrl(serverBaseUrl, roomName)
  };
}

function createMockSubtitleRequest(
  options: MeetingSubtitleSmokeOptions,
  text: {
    isFinal: boolean;
    revision: number;
    sourceText: string;
    translatedText: string;
  }
): MockSubtitleRequest {
  return {
    isFinal: text.isFinal,
    revision: text.revision,
    roomName: options.roomName,
    sourceLanguage: "ko",
    sourceText: text.sourceText,
    speaker: {
      displayName: options.displayName,
      participantIdentity: options.participantIdentity
    },
    subtitleId: options.subtitleId,
    translatedLanguage: "vi",
    translatedText: text.translatedText
  };
}

function normalizeServerBaseUrl(serverBaseUrl: string): string {
  const url = parseUrl(
    serverBaseUrl,
    "MEETING_SUBTITLE_SMOKE_SERVER_BASE_URL"
  );

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(
      "MEETING_SUBTITLE_SMOKE_SERVER_BASE_URL must use http or https"
    );
  }

  if (url.protocol !== "https:" && !isLocalhostUrl(url)) {
    throw new Error(
      "MEETING_SUBTITLE_SMOKE_SERVER_BASE_URL must use https outside localhost"
    );
  }

  url.search = "";
  url.hash = "";

  return stripTrailingSlash(url.toString());
}

function createMockSubtitleUrl(serverBaseUrl: string): string {
  const url = new URL(serverBaseUrl);
  const basePath = url.pathname.replace(/\/+$/, "");
  url.pathname = `${basePath}/meeting/subtitles/mock`;

  return url.toString();
}

function createSubtitleListUrl(serverBaseUrl: string, roomName: string): string {
  const url = new URL(serverBaseUrl);
  const basePath = url.pathname.replace(/\/+$/, "");
  url.pathname = `${basePath}/meeting/rooms/${encodeURIComponent(
    roomName
  )}/subtitles`;

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

  return `lab-likelion-${yyyymmdd}-meeting-room`;
}

function createDefaultSubtitleId(): string {
  return `smoke-${randomUUID().replaceAll("-", "").slice(0, 8)}`;
}

function assertLabRoomName(roomName: string): void {
  if (!LAB_MEETING_ROOM_NAME_PATTERN.test(roomName)) {
    throw new Error(
      "MEETING_SUBTITLE_SMOKE_ROOM_NAME must use lab-<team>-<yyyymmdd>-<slug>"
    );
  }
}

async function postMockSubtitle(
  mockSubtitleUrl: string,
  request: MockSubtitleRequest
): Promise<MockSubtitleResponse> {
  const response = await fetch(mockSubtitleUrl, {
    body: JSON.stringify(request),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  const responseBody = await response.text();

  if (!response.ok) {
    throw new Error(
      `Mock subtitle smoke failed: ${response.status} ${response.statusText} ${responseBody}`
    );
  }

  return responseBody
    ? (JSON.parse(responseBody) as MockSubtitleResponse)
    : never();
}

async function getMockSubtitles(
  subtitleListUrl: string
): Promise<ListMockSubtitlesResponse> {
  const response = await fetch(subtitleListUrl);
  const responseBody = await response.text();

  if (!response.ok) {
    throw new Error(
      `Mock subtitle list smoke failed: ${response.status} ${response.statusText} ${responseBody}`
    );
  }

  return responseBody
    ? (JSON.parse(responseBody) as ListMockSubtitlesResponse)
    : never();
}

function assertMockSubtitleResponse(
  response: MockSubtitleResponse,
  request: MockSubtitleRequest,
  label: string
): void {
  if (!isRecord(response)) {
    throw new Error(`${label} response must be a JSON object`);
  }

  if (response.eventName !== SUBTITLE_CREATED_EVENT) {
    throw new Error(`${label} response must use ${SUBTITLE_CREATED_EVENT}`);
  }

  if (!isRecord(response.payload)) {
    throw new Error(`${label} response payload must be a JSON object`);
  }

  if (response.payload.roomName !== request.roomName) {
    throw new Error(`${label} payload roomName did not match the request`);
  }

  if (response.payload.subtitleId !== request.subtitleId) {
    throw new Error(`${label} payload subtitleId did not match the request`);
  }

  if (response.payload.revision !== request.revision) {
    throw new Error(`${label} payload revision did not match the request`);
  }

  if (response.payload.isFinal !== request.isFinal) {
    throw new Error(`${label} payload finality did not match the request`);
  }
}

function assertLatestSubtitle(
  response: ListMockSubtitlesResponse,
  expectedSubtitle: MockSubtitleRequest
): void {
  if (!isRecord(response)) {
    throw new Error("subtitle list response must be a JSON object");
  }

  if (response.updateStrategy !== SUBTITLE_UPDATE_STRATEGY) {
    throw new Error(
      `subtitle list updateStrategy must be ${SUBTITLE_UPDATE_STRATEGY}`
    );
  }

  const latestSubtitle = response.payloads.find(
    (payload) => payload.subtitleId === expectedSubtitle.subtitleId
  );

  if (!latestSubtitle) {
    throw new Error(
      `subtitle list did not include subtitle ${expectedSubtitle.subtitleId}`
    );
  }

  if (latestSubtitle.revision !== expectedSubtitle.revision) {
    throw new Error(
      `subtitle list revision expected ${expectedSubtitle.revision}, got ${latestSubtitle.revision}`
    );
  }

  if (latestSubtitle.isFinal !== true) {
    throw new Error("subtitle list must keep the final subtitle payload");
  }
}

function printDryRun(
  options: MeetingSubtitleSmokeOptions,
  partialRequest: MockSubtitleRequest,
  finalRequest: MockSubtitleRequest
): void {
  console.log(
    JSON.stringify(
      {
        dryRun: true,
        finalRequest,
        mockSubtitleUrl: options.mockSubtitleUrl,
        partialRequest,
        roomName: options.roomName,
        serverBaseUrl: options.serverBaseUrl,
        subtitleId: options.subtitleId,
        subtitleListUrl: options.subtitleListUrl
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

function never(): never {
  throw new Error("response body must not be empty");
}

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
