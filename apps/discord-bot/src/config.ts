import { z } from "zod";

export const botEnvSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_GUILD_ID: z.string().optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  BOT_INTERNAL_KEY: z.string().min(16),
  BOT_HTTP_PORT: z.coerce.number().default(3001),
  WORKER_URL: z.string().url().default("http://localhost:3002"),
  WORKER_API_KEY: z.string().min(16),
  QUEUE_POLL_INTERVAL_MS: z.coerce.number().default(3000),
});

export type BotEnv = z.infer<typeof botEnvSchema>;

export function loadBotEnv(): BotEnv {
  const parsed = botEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  // Railway injects PORT; fall back when BOT_HTTP_PORT is not set explicitly.
  const port = parsed.data.BOT_HTTP_PORT || Number(process.env.PORT) || 3001;
  return { ...parsed.data, BOT_HTTP_PORT: port };
}
