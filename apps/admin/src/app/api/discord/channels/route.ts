import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { callBotGet } from "@/lib/clients";
import { getEnv } from "@/lib/env";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const data = await callBotGet<{
      guildId: string;
      guildName: string;
      channels: { id: string; name: string }[];
    }>("/internal/guild/channels");

    const env = getEnv();
    return NextResponse.json({
      ...data,
      defaultChannelId: env.DISCORD_CAMPAIGN_CHANNEL_ID ?? null,
      defaultGuildId: env.DISCORD_GUILD_ID ?? data.guildId,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Could not load Discord channels",
        channels: [],
        defaultChannelId: getEnv().DISCORD_CAMPAIGN_CHANNEL_ID ?? null,
        defaultGuildId: getEnv().DISCORD_GUILD_ID ?? null,
      },
      { status: 502 },
    );
  }
}
