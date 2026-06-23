import type { DbClient } from "@clip-central/db";

export type LeaderboardEntry = {
  rank: number;
  discord_id: string;
  discord_username: string;
  discord_avatar: string | null;
  total_views: number;
  clip_count: number;
};

export type LeaderboardSettings = {
  id: string;
  enabled: boolean;
  discord_channel_id: string | null;
  discord_message_id: string | null;
  refresh_interval_minutes: number;
  last_posted_at: string | null;
  updated_at: string;
};

export async function fetchLeaderboardTopUsers(
  db: DbClient,
  limit = 10,
): Promise<LeaderboardEntry[]> {
  const { data, error } = await db.rpc("get_leaderboard_top_users", { p_limit: limit });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    rank: Number(row.rank),
    discord_id: row.discord_id,
    discord_username: row.discord_username,
    discord_avatar: row.discord_avatar,
    total_views: Number(row.total_views),
    clip_count: Number(row.clip_count),
  }));
}

export async function getLeaderboardSettings(db: DbClient): Promise<LeaderboardSettings> {
  const { data, error } = await db.from("leaderboard_settings").select("*").eq("id", "main").single();
  if (error || !data) {
    throw new Error(error?.message ?? "Leaderboard settings not found");
  }
  return data;
}
