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
  BOT_INTERNAL_URL: z.string().url().default("http://localhost:3001"),
  BOT_INTERNAL_KEY: z.string().min(16),
  REFRESH_INTERVAL_HOURS: z.coerce.number().default(6),
  REQUEST_DELAY_MS: z.coerce.number().default(200),
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export function loadWorkerEnv(): WorkerEnv {
  const parsed = workerEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  const env = parsed.data;
  if (env.REDIS_PUBLIC_URL) {
    return { ...env, REDIS_URL: env.REDIS_PUBLIC_URL };
  }
  return env;
}
