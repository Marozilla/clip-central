import { resolveServiceUrl } from "@clip-central/shared";
import { z } from "zod";

const RAILWAY_TEMPLATE_MARKER = "$" + "{{";

function stripEnvQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function resolveRedisUrl(opts: {
  url?: string;
  publicUrl?: string;
  host?: string;
  port?: string | number;
  password?: string;
  user?: string;
}): string {
  const publicUrl = opts.publicUrl ? stripEnvQuotes(opts.publicUrl) : undefined;
  if (publicUrl && !publicUrl.includes(RAILWAY_TEMPLATE_MARKER)) {
    return publicUrl;
  }

  const rawUrl = opts.url ? stripEnvQuotes(opts.url) : undefined;
  if (rawUrl && !rawUrl.includes(RAILWAY_TEMPLATE_MARKER) && isUsableRedisUrl(rawUrl)) {
    return rawUrl;
  }

  const host = opts.host?.trim();
  const port = String(opts.port ?? 6379).trim();
  const password = opts.password?.trim();
  const user = opts.user?.trim() || "default";

  if (host && password) {
    if (host.includes(RAILWAY_TEMPLATE_MARKER) || password.includes(RAILWAY_TEMPLATE_MARKER)) {
      throw new Error(
        "Redis host/password contains an unexpanded Railway reference. " +
          "Use Variables → Add Reference for REDIS_PRIVATE_HOST and REDIS_PASSWORD.",
      );
    }
    return `redis://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}`;
  }

  if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID) {
    if (rawUrl) {
      throw new Error(`REDIS_URL is set but invalid: "${rawUrl}"`);
    }
    throw new Error(
      "Redis is not configured on Railway. Set REDIS_URL to the resolved private URL from the Redis service, " +
        "or set REDIS_PRIVATE_HOST + REDIS_PASSWORD references. See DEPLOY.md.",
    );
  }

  return "redis://localhost:6379";
}

function isUsableRedisUrl(url: string): boolean {
  const trimmed = stripEnvQuotes(url);
  if (trimmed.includes(RAILWAY_TEMPLATE_MARKER)) return false;
  // Reject empty host forms like redis://, redis://:, redis://:@
  if (/^redis:\/\/(?:$|:|@|:@)/i.test(trimmed)) return false;
  const match = trimmed.match(/^redis:\/\/(?:[^:@/]+(?::[^@/]*)?@)?([^:/\s?#]+)(?::(\d+))?/i);
  return Boolean(match?.[1]);
}

export const workerEnvSchema = z.object({
  PORT: z.coerce.number().default(3002),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  /** Full URL — local dev, or paste Railway's resolved private URL */
  REDIS_URL: z.string().optional(),
  /** TCP proxy URL — local dev against remote Redis */
  REDIS_PUBLIC_URL: z.string().optional(),
  /** Railway: reference Redis → RAILWAY_PRIVATE_DOMAIN */
  REDIS_PRIVATE_HOST: z.string().optional(),
  REDISPORT: z.coerce.number().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDISUSER: z.string().optional(),
  WORKER_API_KEY: z.string().min(16),
  SCRAPECREATORS_API_KEY: z.string().min(1),
  BOT_INTERNAL_URL: z.string().optional(),
  DISCORD_BOT_PRIVATE_HOST: z.string().optional(),
  DISCORD_BOT_PRIVATE_PORT: z.coerce.number().optional(),
  BOT_INTERNAL_KEY: z.string().min(16),
  REFRESH_INTERVAL_HOURS: z.coerce.number().default(6),
  REQUEST_DELAY_MS: z.coerce.number().default(200),
});

export type WorkerEnv = z.infer<typeof workerEnvSchema> & {
  BOT_INTERNAL_URL: string;
  REDIS_URL: string;
};

export function loadWorkerEnv(): WorkerEnv {
  const parsed = workerEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  let botInternalUrl: string;
  try {
    botInternalUrl = resolveServiceUrl({
      url: parsed.data.BOT_INTERNAL_URL,
      host: parsed.data.DISCORD_BOT_PRIVATE_HOST,
      port: parsed.data.DISCORD_BOT_PRIVATE_PORT,
      defaultUrl: "http://localhost:3001",
      name: "BOT_INTERNAL_URL",
    });
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  let redisUrl: string;
  try {
    redisUrl = resolveRedisUrl({
      url: parsed.data.REDIS_URL,
      publicUrl: parsed.data.REDIS_PUBLIC_URL,
      host: parsed.data.REDIS_PRIVATE_HOST,
      port: parsed.data.REDISPORT,
      password: parsed.data.REDIS_PASSWORD,
      user: parsed.data.REDISUSER,
    });
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    const raw = process.env.REDIS_URL ?? "(unset)";
    console.error("REDIS_URL raw:", raw.replace(/:([^:@/]+)@/, ":***@"));
    console.error("REDIS_PRIVATE_HOST raw:", process.env.REDIS_PRIVATE_HOST ?? "(unset)");
    process.exit(1);
  }

  return { ...parsed.data, REDIS_URL: redisUrl, BOT_INTERNAL_URL: botInternalUrl };
}
