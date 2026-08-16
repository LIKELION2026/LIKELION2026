import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { AccessToken } from "livekit-server-sdk";

import { LiveKitWebhookService } from "../src/integrations/livekit/livekit-webhook.service";

const API_KEY = "test-api-key";
const API_SECRET = "test-api-secret";

test("receiveWebhook verifies LiveKit signature and summarizes room events", async () => {
  const service = new LiveKitWebhookService(createConfigService());
  const body = JSON.stringify({
    event: "room_started",
    id: "EV_test_1",
    room: {
      name: "lab-likelion-20260816-webhook",
      sid: "RM_test"
    }
  });
  const authorizationHeader = await createWebhookAuthorizationHeader(body);

  const summary = await service.receiveWebhook(
    Buffer.from(body, "utf8"),
    authorizationHeader
  );

  assert.deepEqual(summary, {
    event: "room_started",
    id: "EV_test_1",
    participantIdentity: undefined,
    participantName: undefined,
    roomName: "lab-likelion-20260816-webhook",
    roomSid: "RM_test",
    trackSid: undefined
  });
});

test("receiveWebhook summarizes participant and track fields", async () => {
  const service = new LiveKitWebhookService(createConfigService());
  const body = JSON.stringify({
    event: "track_published",
    participant: {
      identity: "tester-1",
      name: "Tester",
      sid: "PA_test"
    },
    room: {
      name: "lab-likelion-20260816-webhook",
      sid: "RM_test"
    },
    track: {
      name: "camera",
      sid: "TR_test"
    }
  });
  const authorizationHeader = await createWebhookAuthorizationHeader(body);

  const summary = await service.receiveWebhook(
    Buffer.from(body, "utf8"),
    authorizationHeader
  );

  assert.equal(summary.event, "track_published");
  assert.equal(summary.roomName, "lab-likelion-20260816-webhook");
  assert.equal(summary.participantIdentity, "tester-1");
  assert.equal(summary.participantName, "Tester");
  assert.equal(summary.trackSid, "TR_test");
});

test("receiveWebhook rejects missing raw body", async () => {
  const service = new LiveKitWebhookService(createConfigService());

  await assert.rejects(
    () => service.receiveWebhook(undefined, "token"),
    (error: unknown) => error instanceof BadRequestException
  );
});

test("receiveWebhook rejects missing signature", async () => {
  const service = new LiveKitWebhookService(createConfigService());
  const body = JSON.stringify({ event: "room_started" });

  await assert.rejects(
    () => service.receiveWebhook(Buffer.from(body, "utf8")),
    (error: unknown) => error instanceof UnauthorizedException
  );
});

test("receiveWebhook rejects mismatched body hash", async () => {
  const service = new LiveKitWebhookService(createConfigService());
  const signedBody = JSON.stringify({ event: "room_started" });
  const changedBody = JSON.stringify({ event: "room_finished" });
  const authorizationHeader = await createWebhookAuthorizationHeader(signedBody);

  await assert.rejects(
    () =>
      service.receiveWebhook(
        Buffer.from(changedBody, "utf8"),
        authorizationHeader
      ),
    (error: unknown) => error instanceof UnauthorizedException
  );
});

function createConfigService(): ConfigService {
  return {
    getOrThrow<T>(key: string): T {
      const values: Record<string, string> = {
        "livekit.apiKey": API_KEY,
        "livekit.apiSecret": API_SECRET
      };

      if (!(key in values)) {
        throw new Error(`Missing config key: ${key}`);
      }

      return values[key] as T;
    }
  } as ConfigService;
}

async function createWebhookAuthorizationHeader(body: string): Promise<string> {
  const token = new AccessToken(API_KEY, API_SECRET);
  token.sha256 = createHash("sha256").update(body).digest("base64");

  return token.toJwt();
}
