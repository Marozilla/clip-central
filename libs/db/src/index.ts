import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types.js";

export * from "./types.js";
export * from "./leaderboard.js";
export * from "./user-stats.js";

export function createSupabaseClient(
  url: string,
  serviceRoleKey: string,
): SupabaseClient<Database> {
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type DbClient = SupabaseClient<Database>;
