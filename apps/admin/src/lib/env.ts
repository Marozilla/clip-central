import { resolveServiceUrl } from "@clip-central/shared";
import { z } from "zod";

const envSchema = z.object({
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(16),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  ADMIN_DISCORD_IDS: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  BOT_INTERNAL_URL: z.string().optional(),
  DISCORD_BOT_PRIVATE_HOST: z.string().optional(),
  DISCORD_BOT_PRIVATE_PORT: z.coerce.number().optional(),
  BOT_INTERNAL_KEY: z.string().min(16),
  WORKER_URL: z.string().optional(),
  VIDEOS_WORKER_PRIVATE_HOST: z.string().optional(),
  VIDEOS_WORKER_PRIVATE_PORT: z.coerce.number().optional(),
  WORKER_API_KEY: z.string().min(16),
  DISCORD_GUILD_ID: z.string().optional(),
  DISCORD_CAMPAIGN_CHANNEL_ID: z.string().optional(),
});

export type AdminEnv = z.infer<typeof envSchema> & {
  BOT_INTERNAL_URL: string;
  WORKER_URL: string;
};

let cached: AdminEnv | null = null;

export function getEnv(): AdminEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid env: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
  }

  let botInternalUrl: string;
  let workerUrl: string;
  try {
    botInternalUrl = resolveServiceUrl({
      url: parsed.data.BOT_INTERNAL_URL,
      host: parsed.data.DISCORD_BOT_PRIVATE_HOST,
      port: parsed.data.DISCORD_BOT_PRIVATE_PORT,
      defaultUrl: "http://localhost:3001",
      name: "BOT_INTERNAL_URL",
    });
    workerUrl = resolveServiceUrl({
      url: parsed.data.WORKER_URL,
      host: parsed.data.VIDEOS_WORKER_PRIVATE_HOST,
      port: parsed.data.VIDEOS_WORKER_PRIVATE_PORT,
      defaultUrl: "http://localhost:3002",
      name: "WORKER_URL",
    });
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : String(err));
  }

  cached = { ...parsed.data, BOT_INTERNAL_URL: botInternalUrl, WORKER_URL: workerUrl };
  return cached;
}

export function getAdminDiscordIds(): string[] {
  return getEnv().ADMIN_DISCORD_IDS.split(",").map((s) => s.trim()).filter(Boolean);
}
