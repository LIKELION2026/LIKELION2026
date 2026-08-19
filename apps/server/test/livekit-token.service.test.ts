import assert from "node:assert/strict";
import { test } from "node:test";

import type { ConfigService } from "@nestjs/config";

import { LiveKitTokenService } from "../src/integrations/livekit/livekit-token.service";

interface LiveKitJwtClaims {
  attributes: {
    participantCountry?: string;
    preferredLanguage?: string;
    roomName?: string;
    translationReceivingEnabled?: string;
    translationTargetLanguage?: string;
  };
  name: string;
  sub: string;
  video: {
    canPublish: boolean;
    canPublishData: boolean;
    canPublishSources: string[];
    canSubscribe: boolean;
    canUpdateOwnMetadata: boolean;
    room: string;
    roomJoin: boolean;
  };
}

test("createRoomJoinToken limits publish sources to camera and microphone", async () => {
  const service = new LiveKitTokenService(
    createConfigService({
      "livekit.apiKey": "test-api-key",
      "livekit.apiSecret": "test-api-secret",
      "livekit.tokenTtlSeconds": 300,
      "livekit.url": "wss://example.livekit.cloud"
    })
  );

  const result = await service.createRoomJoinToken({
    attributes: {
      participantCountry: "kr",
      preferredLanguage: "ko",
      roomName: "lab-likelion-20260816-test",
      translationReceivingEnabled: "false",
      translationTargetLanguage: "vi"
    },
    participantIdentity: "tester-1",
    participantName: "Tester",
    roomName: "lab-likelion-20260816-test"
  });
  const claims = decodeJwtPayload(result.token);

  assert.equal(claims.video.roomJoin, true);
  assert.equal(claims.video.canSubscribe, true);
  assert.equal(claims.video.canPublish, true);
  assert.equal(claims.video.canPublishData, true);
  assert.equal(claims.video.canUpdateOwnMetadata, true);
  assert.deepEqual(claims.video.canPublishSources, ["camera", "microphone"]);
  assert.equal(claims.video.room, "lab-likelion-20260816-test");
  assert.equal(claims.sub, "tester-1");
  assert.equal(claims.name, "Tester");
  assert.equal(claims.attributes.participantCountry, "kr");
  assert.equal(claims.attributes.preferredLanguage, "ko");
  assert.equal(claims.attributes.translationReceivingEnabled, "false");
  assert.equal(claims.attributes.translationTargetLanguage, "vi");
});

function createConfigService(values: Record<string, unknown>): ConfigService {
  return {
    getOrThrow<T>(key: string): T {
      if (!(key in values)) {
        throw new Error(`Missing config key: ${key}`);
      }

      return values[key] as T;
    }
  } as ConfigService;
}

function decodeJwtPayload(token: string): LiveKitJwtClaims {
  const [, encodedPayload] = token.split(".");
  assert.ok(encodedPayload, "JWT payload must exist");

  const normalizedPayload = encodedPayload
    .replaceAll("-", "+")
    .replaceAll("_", "/");
  const paddedPayload = normalizedPayload.padEnd(
    normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
    "="
  );

  return JSON.parse(
    Buffer.from(paddedPayload, "base64").toString("utf8")
  ) as LiveKitJwtClaims;
}
