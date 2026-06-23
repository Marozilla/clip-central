import { z } from "zod";

const envSchema = z.object({
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(16),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  ADMIN_DISCORD_IDS: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  BOT_INTERNAL_URL: z.string().url().default("http://localhost:3001"),
  BOT_INTERNAL_KEY: z.string().min(16),
  WORKER_URL: z.string().url().default("http://localhost:3002"),
  WORKER_API_KEY: z.string().min(16),
  DISCORD_GUILD_ID: z.string().optional(),
  DISCORD_CAMPAIGN_CHANNEL_ID: z.string().optional(),
});

export type AdminEnv = z.infer<typeof envSchema>;

let cached: AdminEnv | null = null;

export function getEnv(): AdminEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid env: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
  }
  cached = parsed.data;
  return cached;
}

export function getAdminDiscordIds(): string[] {
  return getEnv().ADMIN_DISCORD_IDS.split(",").map((s) => s.trim()).filter(Boolean);
}
