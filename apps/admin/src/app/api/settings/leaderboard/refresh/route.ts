import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { refreshLeaderboardOnDiscord } from "@/lib/discord-leaderboard";

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;

  const result = await refreshLeaderboardOnDiscord();
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Refresh failed" }, { status: 502 });
  }

  return NextResponse.json(result);
}
