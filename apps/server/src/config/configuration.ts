interface AppConfig {
  corsOrigins: string[] | true;
  nodeEnv: string;
  port: number;
}

interface LiveKitConfig {
  apiKey: string;
  apiSecret: string;
  tokenTtlSeconds: number;
  url: string;
}

export interface ServerConfiguration {
  app: AppConfig;
  livekit: LiveKitConfig;
}

export function configuration(): ServerConfiguration {
  return {
    app: {
      corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
      nodeEnv: process.env.NODE_ENV ?? "development",
      port: Number(process.env.PORT ?? 4000)
    },
    livekit: {
      apiKey: requireEnv("LIVEKIT_API_KEY"),
      apiSecret: requireEnv("LIVEKIT_API_SECRET"),
      tokenTtlSeconds: Number(process.env.LIVEKIT_TOKEN_TTL_SECONDS ?? 900),
      url: requireEnv("LIVEKIT_URL")
    }
  };
}

function parseCorsOrigins(value: string | undefined): string[] | true {
  if (!value || value.trim() === "*") {
    return true;
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`[config] Missing required environment variable: ${name}`);
  }

  return value.trim();
}
