import { resolveServiceUrl } from "@clip-central/shared";
import { z } from "zod";

export const botEnvSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_GUILD_ID: z.string().optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  BOT_INTERNAL_KEY: z.string().min(16),
  BOT_HTTP_PORT: z.preprocess(
    (val) => (val === undefined || val === "" ? undefined : val),
    z.coerce.number().optional(),
  ),
  WORKER_URL: z.string().optional(),
  VIDEOS_WORKER_PRIVATE_HOST: z.string().optional(),
  VIDEOS_WORKER_PRIVATE_PORT: z.coerce.number().optional(),
  WORKER_API_KEY: z.string().min(16),
  QUEUE_POLL_INTERVAL_MS: z.coerce.number().default(3000),
});

export type BotEnv = z.infer<typeof botEnvSchema> & {
  WORKER_URL: string;
  BOT_HTTP_PORT: number;
};

export function loadBotEnv(): BotEnv {
  const parsed = botEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  let workerUrl: string;
  try {
    workerUrl = resolveServiceUrl({
      url: parsed.data.WORKER_URL,
      host: parsed.data.VIDEOS_WORKER_PRIVATE_HOST,
      port: parsed.data.VIDEOS_WORKER_PRIVATE_PORT,
      defaultUrl: "http://localhost:3002",
      name: "WORKER_URL",
    });
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  const port = parsed.data.BOT_HTTP_PORT ?? (Number(process.env.PORT) || 3001);
  return { ...parsed.data, BOT_HTTP_PORT: port, WORKER_URL: workerUrl };
}
