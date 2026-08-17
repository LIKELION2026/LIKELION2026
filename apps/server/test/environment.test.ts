import assert from "node:assert/strict";
import { test } from "node:test";

import { validateEnvironment } from "../src/config/environment";

test("validateEnvironment normalizes valid LiveKit server config", () => {
  const result = validateEnvironment({
    LIVEKIT_API_KEY: " key ",
    LIVEKIT_API_SECRET: " secret ",
    LIVEKIT_TOKEN_TTL_SECONDS: "120",
    LIVEKIT_URL: " wss://example.livekit.cloud ",
    PORT: "4100",
    SUPABASE_SECRET_KEY: "test-supabase-secret",
    SUPABASE_URL: "https://example.supabase.co"
  });

  assert.equal(result.LIVEKIT_URL, "wss://example.livekit.cloud");
  assert.equal(result.LIVEKIT_TOKEN_TTL_SECONDS, 120);
  assert.equal(result.NODE_ENV, "development");
  assert.equal(result.PORT, 4100);
});

test("validateEnvironment rejects missing LiveKit secrets", () => {
  assert.throws(
    () =>
      validateEnvironment({
        LIVEKIT_API_KEY: "",
        LIVEKIT_API_SECRET: "secret",
        LIVEKIT_URL: "wss://example.livekit.cloud",
        SUPABASE_SECRET_KEY: "test-supabase-secret",
        SUPABASE_URL: "https://example.supabase.co"
      }),
    /LIVEKIT_API_KEY/
  );
});

test("validateEnvironment rejects non-wss LiveKit URLs", () => {
  assert.throws(
    () =>
      validateEnvironment({
        LIVEKIT_API_KEY: "key",
        LIVEKIT_API_SECRET: "secret",
        LIVEKIT_URL: "https://example.livekit.cloud",
        SUPABASE_SECRET_KEY: "test-supabase-secret",
        SUPABASE_URL: "https://example.supabase.co"
      }),
    /LIVEKIT_URL must start with wss:\/\//
  );
});

test("validateEnvironment rejects token TTL shorter than 60 seconds", () => {
  assert.throws(
    () =>
      validateEnvironment({
        LIVEKIT_API_KEY: "key",
        LIVEKIT_API_SECRET: "secret",
        LIVEKIT_TOKEN_TTL_SECONDS: "30",
        LIVEKIT_URL: "wss://example.livekit.cloud",
        SUPABASE_SECRET_KEY: "test-supabase-secret",
        SUPABASE_URL: "https://example.supabase.co"
      }),
    /LIVEKIT_TOKEN_TTL_SECONDS/
  );
});
