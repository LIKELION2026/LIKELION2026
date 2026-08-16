const REQUIRED_ENV_KEYS = [
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
  "LIVEKIT_URL",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_URL"
] as const;

export function validateEnvironment(
  config: Record<string, unknown>
): Record<string, unknown> {
  const missingKeys = REQUIRED_ENV_KEYS.filter((key) => !hasValue(config[key]));

  if (missingKeys.length > 0) {
    throw new Error(
      `[config] Missing required environment variables: ${missingKeys.join(", ")}`
    );
  }

  const port = Number(config.PORT ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("[config] PORT must be an integer between 1 and 65535");
  }

  const liveKitUrl = String(config.LIVEKIT_URL ?? "").trim();
  if (!liveKitUrl.startsWith("wss://")) {
    throw new Error("[config] LIVEKIT_URL must start with wss://");
  }

  const tokenTtlSeconds = Number(config.LIVEKIT_TOKEN_TTL_SECONDS ?? 900);
  if (!Number.isInteger(tokenTtlSeconds) || tokenTtlSeconds < 60) {
    throw new Error(
      "[config] LIVEKIT_TOKEN_TTL_SECONDS must be an integer greater than or equal to 60"
    );
  }

  return {
    ...config,
    LIVEKIT_URL: liveKitUrl,
    LIVEKIT_TOKEN_TTL_SECONDS: tokenTtlSeconds,
    NODE_ENV: config.NODE_ENV ?? "development",
    PORT: port
  };
}

function hasValue(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
