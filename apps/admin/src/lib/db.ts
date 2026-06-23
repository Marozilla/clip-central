import { createSupabaseClient } from "@clip-central/db";
import { getEnv } from "./env";

export function getDb() {
  const env = getEnv();
  return createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}
