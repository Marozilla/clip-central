import type { DbClient } from "@clip-central/db";
import { callBot } from "./clients";

export type DiscordPublishResult = {
  ok: boolean;
  messageId?: string | null;
  error?: string;
};

export async function publishCampaignToDiscord(
  db: DbClient,
  campaignId: string,
): Promise<DiscordPublishResult> {
  try {
    const result = (await callBot("/internal/campaign/post", { campaignId })) as {
      messageId?: string | null;
      error?: string;
    };

    if (result.messageId) {
      await db
        .from("campaigns")
        .update({ discord_message_id: result.messageId })
        .eq("id", campaignId);
      return { ok: true, messageId: result.messageId };
    }

    return {
      ok: false,
      error:
        result.error ??
        "Bot did not post the embed. Check that the bot is running and has access to the channel.",
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Could not reach the Discord bot — is it running on BOT_INTERNAL_URL?",
    };
  }
}
