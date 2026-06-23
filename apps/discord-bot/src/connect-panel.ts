import type { DbClient } from "@clip-central/db";
import type { Client, TextChannel } from "discord.js";
import { buildConnectButtons, buildConnectEmbed, clipCentralLogoFiles } from "./embeds.js";

/**
 * Post (or edit in place) the managed "Connect Socials" panel — the embed with
 * the Connect Account button that lets creators link their social accounts.
 */
export async function refreshConnectPanel(
  client: Client,
  db: DbClient,
): Promise<{ ok: boolean; error?: string; posted?: boolean }> {
  if (!client.isReady()) {
    return { ok: false, error: "Discord bot is not ready yet" };
  }

  const { data: settings } = await db
    .from("connect_panel_settings")
    .select("*")
    .eq("id", "main")
    .single();

  if (!settings) {
    return { ok: false, error: "Connect panel settings not found" };
  }

  if (!settings.discord_channel_id) {
    return { ok: false, error: "Connect panel channel is not configured" };
  }

  const embed = buildConnectEmbed({
    title: settings.title,
    description: settings.description,
  });
  const components = buildConnectButtons();

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

  if (settings.discord_message_id) {
    try {
      const msg = await channel.messages.fetch(settings.discord_message_id);
      await msg.edit({ embeds: [embed], components, attachments: [], files: clipCentralLogoFiles() });
      await db
        .from("connect_panel_settings")
        .update({ last_posted_at: now })
        .eq("id", "main");
      return { ok: true, posted: false };
    } catch {
      console.warn("Connect panel message missing — posting a new embed");
    }
  }

  try {
    const msg = await channel.send({ embeds: [embed], components, files: clipCentralLogoFiles() });
    await db
      .from("connect_panel_settings")
      .update({ discord_message_id: msg.id, last_posted_at: now })
      .eq("id", "main");
    return { ok: true, posted: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to post connect panel embed",
    };
  }
}
