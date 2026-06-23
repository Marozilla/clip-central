import type { LeaderboardEntry } from "@clip-central/db";
import { formatNumber } from "@clip-central/shared";
import { EmbedBuilder } from "discord.js";
import { applyClipCentralFooter } from "./embeds.js";

const MEDALS = ["🥇", "🥈", "🥉"];

function formatLeaderboardLine(entry: LeaderboardEntry): string {
  const medal = entry.rank <= 3 ? MEDALS[entry.rank - 1] : `\`${entry.rank}.\``;
  const views = formatNumber(entry.total_views);
  const clips = entry.clip_count === 1 ? "1 clip" : `${entry.clip_count} clips`;
  return `${medal} **${entry.discord_username}** — ${views} views · ${clips}`;
}

export function buildLeaderboardEmbed(
  entries: LeaderboardEntry[],
  refreshIntervalMinutes = 10,
): EmbedBuilder {
  const description =
    entries.length > 0
      ? entries.map(formatLeaderboardLine).join("\n")
      : "_No ranked creators yet — submit and get clips approved to appear here!_";

  return applyClipCentralFooter(
    new EmbedBuilder()
      .setTitle("🏆 Creator Leaderboard")
      .setDescription(
        "Top creators by **campaign views gained** across all campaigns.\n\n" + description,
      )
      .setColor(0xf4c543)
      .setTimestamp(new Date()),
    `Updates every ${refreshIntervalMinutes} minutes · Approved clips only`,
  );
}
