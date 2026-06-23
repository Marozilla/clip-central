import type { DbClient } from "@clip-central/db";
import { fetchLeaderboardTopUsers, getLeaderboardSettings } from "@clip-central/db";
import type { Client, TextChannel } from "discord.js";
import { buildLeaderboardEmbed } from "./leaderboard.js";
import { clipCentralLogoFiles } from "./embeds.js";

export async function refreshLeaderboardEmbed(
  client: Client,
  db: DbClient,
): Promise<{ ok: boolean; error?: string; posted?: boolean }> {
  if (!client.isReady()) {
    return { ok: false, error: "Discord bot is not ready yet" };
  }

  const settings = await getLeaderboardSettings(db);
  if (!settings.enabled) {
    return { ok: true };
  }

  if (!settings.discord_channel_id) {
    return { ok: false, error: "Leaderboard channel is not configured" };
  }

  const entries = await fetchLeaderboardTopUsers(db, 10);
  const embed = buildLeaderboardEmbed(entries, settings.refresh_interval_minutes);

  let channel: TextChannel;
  try {
    const fetched = await client.channels.fetch(settings.discord_channel_id);
    if (!fetched?.isTextBased() || fetched.isDMBased()) {
      return { ok: false, error: "Configured channel is not a text channel" };
    }
    channel = fetched as TextChannel;
  } catch {
    return { ok: false, error: "Could not access the configured Discord channel" };
  }

  const now = new Date().toISOString();
  let posted = false;

  if (settings.discord_message_id) {
    try {
      const msg = await channel.messages.fetch(settings.discord_message_id);
      await msg.edit({ embeds: [embed], attachments: [], files: clipCentralLogoFiles() });
      await db
        .from("leaderboard_settings")
        .update({ last_posted_at: now })
        .eq("id", "main");
      return { ok: true, posted: false };
    } catch {
      console.warn("Leaderboard message missing — posting a new embed");
    }
  }

  try {
    const msg = await channel.send({ embeds: [embed], files: clipCentralLogoFiles() });
    await db
      .from("leaderboard_settings")
      .update({
        discord_message_id: msg.id,
        last_posted_at: now,
      })
      .eq("id", "main");
    posted = true;
    return { ok: true, posted };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to post leaderboard embed",
    };
  }
}

export function startLeaderboardPoller(client: Client, db: DbClient): NodeJS.Timeout {
  const tick = async () => {
    try {
      const settings = await getLeaderboardSettings(db);
      if (!settings.enabled || !settings.discord_channel_id) return;

      const intervalMs = settings.refresh_interval_minutes * 60_000;
      if (settings.last_posted_at) {
        const elapsed = Date.now() - new Date(settings.last_posted_at).getTime();
        if (elapsed < intervalMs) return;
      }

      await refreshLeaderboardEmbed(client, db);
    } catch (err) {
      console.warn("Leaderboard poll failed:", err);
    }
  };

  void tick();
  return setInterval(tick, 60_000);
}
