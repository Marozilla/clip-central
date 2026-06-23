import type { ClipReviewNotification } from "@clip-central/shared";
import express from "express";
import type { Client } from "discord.js";
import { EmbedBuilder } from "discord.js";
import type { BotEnv } from "./config.js";
import { refreshConnectPanel } from "./connect-panel.js";
import { editCampaignEmbed, postCampaignEmbed, buildClipReviewEmbed, sendChannelMessage, sendDm } from "./embeds.js";
import { refreshLeaderboardEmbed } from "./leaderboard-poller.js";

function authMiddleware(apiKey: string) {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const auth = req.headers.authorization;
    const key = auth?.startsWith("Bearer ") ? auth.slice(7) : req.headers["x-api-key"];
    if (key !== apiKey) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  };
}

export function createInternalServer(
  client: Client,
  env: BotEnv,
): express.Application {
  const app = express();
  app.use(express.json());
  app.use(authMiddleware(env.BOT_INTERNAL_KEY));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", ready: client.isReady() });
  });

  app.post("/internal/dm/send", async (req, res) => {
    const { discordId, message, clipNotification } = req.body as {
      discordId?: string;
      message?: string;
      clipNotification?: ClipReviewNotification;
    };

    if (!discordId) {
      res.status(400).json({ error: "discordId required" });
      return;
    }

    if (clipNotification) {
      const ok = await sendDm(client, discordId, {
        embeds: [buildClipReviewEmbed(clipNotification)],
      });
      res.json({ ok });
      return;
    }

    if (!message) {
      res.status(400).json({ error: "message or clipNotification required" });
      return;
    }

    const ok = await sendDm(client, discordId, message);
    res.json({ ok });
  });

  app.post("/internal/channel/send", async (req, res) => {
    const { channelId, content, embed } = req.body as {
      channelId?: string;
      content?: string;
      embed?: { title?: string; description?: string; color?: number };
    };

    if (!channelId || !content) {
      res.status(400).json({ error: "channelId and content required" });
      return;
    }

    const embedBuilder = embed
      ? new EmbedBuilder()
          .setTitle(embed.title ?? null)
          .setDescription(embed.description ?? null)
          .setColor(embed.color ?? 0x5865f2)
      : undefined;

    const messageId = await sendChannelMessage(client, channelId, content, embedBuilder);
    res.json({ messageId });
  });

  app.get("/internal/guild/channels", async (_req, res) => {
    if (!env.DISCORD_GUILD_ID) {
      res.status(400).json({ error: "DISCORD_GUILD_ID not configured on the bot" });
      return;
    }

    if (!client.isReady()) {
      res.status(503).json({ error: "Discord bot is not ready yet" });
      return;
    }

    try {
      const guild = await client.guilds.fetch(env.DISCORD_GUILD_ID);
      const channels = await guild.channels.fetch();
      const textChannels = [...channels.values()]
        .filter((ch) => ch?.isTextBased() && !ch.isDMBased())
        .map((ch) => ({ id: ch!.id, name: ch!.name }))
        .sort((a, b) => a.name.localeCompare(b.name));

      res.json({ guildId: guild.id, guildName: guild.name, channels: textChannels });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Failed to fetch guild channels",
      });
    }
  });

  app.post("/internal/campaign/post", async (req, res) => {
    const { campaignId } = req.body as { campaignId?: string };
    if (!campaignId) {
      res.status(400).json({ error: "campaignId required" });
      return;
    }

    if (!client.isReady()) {
      res.status(503).json({ error: "Discord bot is not ready yet" });
      return;
    }

    const { createSupabaseClient } = await import("@clip-central/db");
    const db = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: campaign } = await db
      .from("campaigns")
      .select("discord_channel_id")
      .eq("id", campaignId)
      .single();

    if (!campaign?.discord_channel_id) {
      res.status(400).json({ error: "Campaign has no Discord channel ID set" });
      return;
    }

    const messageId = await postCampaignEmbed(client, db, campaignId);
    if (!messageId) {
      res.status(500).json({
        error: "Could not post embed — bot may lack channel permissions",
      });
      return;
    }

    res.json({ messageId });
  });

  app.post("/internal/campaign/edit", async (req, res) => {
    const { campaignId } = req.body as { campaignId?: string };
    if (!campaignId) {
      res.status(400).json({ error: "campaignId required" });
      return;
    }

    const { createSupabaseClient } = await import("@clip-central/db");
    const db = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    await editCampaignEmbed(client, db, campaignId);
    res.json({ ok: true });
  });

  app.post("/internal/connect-panel/refresh", async (_req, res) => {
    if (!client.isReady()) {
      res.status(503).json({ error: "Discord bot is not ready yet" });
      return;
    }

    const { createSupabaseClient } = await import("@clip-central/db");
    const db = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const result = await refreshConnectPanel(client, db);
    if (!result.ok) {
      res.status(result.error?.includes("not configured") ? 400 : 502).json(result);
      return;
    }
    res.json(result);
  });

  app.post("/internal/leaderboard/refresh", async (_req, res) => {
    if (!client.isReady()) {
      res.status(503).json({ error: "Discord bot is not ready yet" });
      return;
    }

    const { createSupabaseClient } = await import("@clip-central/db");
    const db = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const result = await refreshLeaderboardEmbed(client, db);
    if (!result.ok) {
      res.status(result.error?.includes("not configured") ? 400 : 502).json(result);
      return;
    }
    res.json(result);
  });

  return app;
}
