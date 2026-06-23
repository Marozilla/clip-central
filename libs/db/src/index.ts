import { createClient, SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";
import type { Database } from "./types.js";

export * from "./types.js";
export * from "./leaderboard.js";
export * from "./user-stats.js";

export function createSupabaseClient(
  url: string,
  serviceRoleKey: string,
): SupabaseClient<Database> {
  const options: NonNullable<Parameters<typeof createClient<Database>>[2]> = {
    auth: { persistSession: false, autoRefreshToken: false },
  };

  // Node.js < 22 has no native WebSocket; @supabase/realtime-js requires a transport.
  if (typeof WebSocket === "undefined") {
    options.realtime = { transport: ws as unknown as typeof WebSocket };
  }

  return createClient<Database>(url, serviceRoleKey, options);
}

export type DbClient = SupabaseClient<Database>;
