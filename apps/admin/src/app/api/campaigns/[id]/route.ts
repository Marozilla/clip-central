import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { callBot } from "@/lib/clients";
import { publishCampaignToDiscord } from "@/lib/discord-campaign";
import { getDb } from "@/lib/db";
import type { Platform } from "@clip-central/shared";
import type { Database } from "@clip-central/db";

type Params = { params: Promise<{ id: string }> };
type CampaignUpdate = Database["public"]["Tables"]["campaigns"]["Update"];

export async function GET(_request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const db = getDb();

  const { data: campaign, error: campError } = await db
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (campError) {
    return NextResponse.json({ error: campError.message }, { status: 404 });
  }

  const { data: clips } = await db
    .from("clips")
    .select("*")
    .eq("campaign_id", id)
    .order("submitted_at", { ascending: false });

  const { data: participants } = await db
    .from("campaign_participants")
    .select("*, users(*)")
    .eq("campaign_id", id);

  return NextResponse.json({ campaign, clips: clips ?? [], participants: participants ?? [] });
}

export async function PATCH(request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const db = getDb();

  const updates: CampaignUpdate = {};
  for (const key of [
    "title",
    "description",
    "status",
    "rate_per_view",
    "budget_cap",
    "min_views_for_payout",
    "embed_thumbnail_url",
    "embed_image_url",
    "platforms",
    "starts_at",
    "ends_at",
    "discord_channel_id",
    "discord_guild_id",
  ] as const) {
    if (body[key] !== undefined) {
      (updates as Record<string, unknown>)[key] = body[key];
    }
  }

  if (updates.platforms) updates.platforms = updates.platforms as Platform[];

  const { data, error: updateError } = await db
    .from("campaigns")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  let discord = null;
  if (data.discord_message_id) {
    try {
      await callBot("/internal/campaign/edit", { campaignId: id });
      discord = { ok: true, messageId: data.discord_message_id };
    } catch (err) {
      discord = {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to update Discord embed",
      };
    }
  } else if (data.status === "active" && data.discord_channel_id) {
    discord = await publishCampaignToDiscord(db, id);
  }

  return NextResponse.json({ ...data, discord });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const db = getDb();

  const { error: updateError } = await db
    .from("campaigns")
    .update({ status: "completed" })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
