import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { publishCampaignToDiscord } from "@/lib/discord-campaign";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import type { Platform } from "@clip-central/shared";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const db = getDb();
  const { data, error: dbError } = await db
    .from("campaigns")
    .select("*, clips(count)")
    .order("created_at", { ascending: false });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const {
    title,
    description,
    rate_per_view,
    budget_cap,
    min_views_for_payout,
    embed_thumbnail_url,
    embed_image_url,
    platforms,
    discord_channel_id,
    discord_guild_id,
  } = body;

  if (!title || rate_per_view === undefined || budget_cap === undefined) {
    return NextResponse.json(
      { error: "title, rate_per_view, and budget_cap are required" },
      { status: 400 },
    );
  }

  const minViews = Number(min_views_for_payout ?? 0);
  if (!Number.isFinite(minViews) || minViews < 0) {
    return NextResponse.json(
      { error: "min_views_for_payout must be a non-negative number" },
      { status: 400 },
    );
  }

  const env = getEnv();
  const resolvedChannelId =
    discord_channel_id || env.DISCORD_CAMPAIGN_CHANNEL_ID || null;
  const resolvedGuildId = discord_guild_id || env.DISCORD_GUILD_ID || null;

  if (!resolvedChannelId) {
    return NextResponse.json(
      {
        error:
          "Pick a Discord channel in the form or set DISCORD_CAMPAIGN_CHANNEL_ID in .env",
      },
      { status: 400 },
    );
  }

  const db = getDb();
  const { data: campaign, error: insertError } = await db
    .from("campaigns")
    .insert({
      title,
      description: description ?? null,
      rate_per_view,
      budget_cap,
      min_views_for_payout: Math.floor(minViews),
      embed_thumbnail_url: embed_thumbnail_url ?? null,
      embed_image_url: embed_image_url ?? null,
      platforms: (platforms ?? []) as Platform[],
      discord_channel_id: resolvedChannelId,
      discord_guild_id: resolvedGuildId,
      status: "active",
      created_by: session!.user.id,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  let discord = null;
  if (campaign.status === "active" && campaign.discord_channel_id) {
    discord = await publishCampaignToDiscord(db, campaign.id);
  }

  return NextResponse.json({ ...campaign, discord }, { status: 201 });
}
