import { resolveServiceUrl } from "@clip-central/shared";
import { z } from "zod";

export const workerEnvSchema = z.object({
  PORT: z.coerce.number().default(3002),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  /** Railway private network URL — use on deployed services */
  REDIS_URL: z.string().default("redis://localhost:6379"),
  /** TCP proxy URL from Railway — set this for local dev against remote Redis */
  REDIS_PUBLIC_URL: z.string().optional(),
  WORKER_API_KEY: z.string().min(16),
  SCRAPECREATORS_API_KEY: z.string().min(1),
  /** Full URL (local dev) OR use DISCORD_BOT_PRIVATE_HOST + PORT on Railway */
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
    console.error("BOT_INTERNAL_URL raw:", process.env.BOT_INTERNAL_URL ?? "(unset)");
    console.error(
      "DISCORD_BOT_PRIVATE_HOST raw:",
      process.env.DISCORD_BOT_PRIVATE_HOST ?? "(unset)",
    );
    console.error(
      "DISCORD_BOT_PRIVATE_PORT raw:",
      process.env.DISCORD_BOT_PRIVATE_PORT ?? "(unset)",
    );
    process.exit(1);
  }

  const env = parsed.data;
  const redisUrl = env.REDIS_PUBLIC_URL?.trim() ? env.REDIS_PUBLIC_URL : env.REDIS_URL;

  return { ...env, REDIS_URL: redisUrl, BOT_INTERNAL_URL: botInternalUrl };
}
