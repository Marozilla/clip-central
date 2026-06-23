import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getDb } from "@/lib/db";
import type { Database } from "@clip-central/db";

type ConnectPanelUpdate = Database["public"]["Tables"]["connect_panel_settings"]["Update"];

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const db = getDb();
  const { data, error: dbError } = await db
    .from("connect_panel_settings")
    .select("*")
    .eq("id", "main")
    .single();

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

  const { data: existing } = await db
    .from("connect_panel_settings")
    .select("*")
    .eq("id", "main")
    .single();
  if (!existing) {
    return NextResponse.json({ error: "Settings not found" }, { status: 404 });
  }

  const updates: ConnectPanelUpdate = {};

  if (body.discord_channel_id !== undefined) {
    const channelId = body.discord_channel_id || null;
    updates.discord_channel_id = channelId;
    // Channel changed → drop the stored message so the next sync posts a fresh one.
    if (channelId !== existing.discord_channel_id) {
      updates.discord_message_id = null;
    }
  }

  if (body.title !== undefined) {
    updates.title = (body.title || "").trim() || null;
  }

  if (body.description !== undefined) {
    updates.description = (body.description || "").trim() || null;
  }

  const { data, error: updateError } = await db
    .from("connect_panel_settings")
    .update(updates)
    .eq("id", "main")
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
