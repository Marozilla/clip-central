import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getDb } from "@/lib/db";
import type { Database } from "@clip-central/db";

type LeaderboardUpdate = Database["public"]["Tables"]["leaderboard_settings"]["Update"];

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const db = getDb();
  const { data, error: dbError } = await db.from("leaderboard_settings").select("*").eq("id", "main").single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const db = getDb();

  const { data: existing } = await db.from("leaderboard_settings").select("*").eq("id", "main").single();
  if (!existing) {
    return NextResponse.json({ error: "Settings not found" }, { status: 404 });
  }

  const updates: LeaderboardUpdate = {};

  if (typeof body.enabled === "boolean") {
    updates.enabled = body.enabled;
  }

  if (body.discord_channel_id !== undefined) {
    const channelId = body.discord_channel_id || null;
    updates.discord_channel_id = channelId;
    if (channelId !== existing.discord_channel_id) {
      updates.discord_message_id = null;
    }
  }

  if (body.refresh_interval_minutes !== undefined) {
    const minutes = Number(body.refresh_interval_minutes);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 60) {
      return NextResponse.json(
        { error: "refresh_interval_minutes must be between 1 and 60" },
        { status: 400 },
      );
    }
    updates.refresh_interval_minutes = minutes;
  }

  if (updates.enabled === true && !updates.discord_channel_id && !existing.discord_channel_id) {
    return NextResponse.json(
      { error: "Pick a Discord channel before enabling the leaderboard" },
      { status: 400 },
    );
  }

  const { data, error: updateError } = await db
    .from("leaderboard_settings")
    .update(updates)
    .eq("id", "main")
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
