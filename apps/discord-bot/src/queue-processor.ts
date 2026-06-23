import type { DbClient, Json } from "@clip-central/db";
import type { ClipReviewNotification, ClipVideoMetadata, Platform } from "@clip-central/shared";
import { PLATFORM_LABELS } from "@clip-central/shared";
import type { Client } from "discord.js";
import type { BotEnv } from "./config.js";
import { buildClipReviewEmbed, sendDm } from "./embeds.js";
import { callWorker } from "./worker-client.js";

interface VerifyVideoResult {
  ok: boolean;
  videoId?: string;
  platform?: string;
  ownerHandle?: string;
  linkedHandle?: string;
  initialViews?: number;
  metadata?: ClipVideoMetadata;
  error?: string;
}

async function getCampaignTitle(db: DbClient, campaignId: string): Promise<string> {
  const { data } = await db.from("campaigns").select("title").eq("id", campaignId).single();
  return data?.title ?? "Campaign";
}

async function sendSubmissionFailed(
  client: Client,
  discordId: string,
  payload: Omit<ClipReviewNotification, "kind">,
): Promise<void> {
  await sendDm(client, discordId, {
    embeds: [buildClipReviewEmbed({ kind: "failed", ...payload })],
  });
}

/**
 * Defense-in-depth re-check at processing time: the submitter must still have a
 * verified social account on one of the campaign's allowed platforms (their
 * account could have been unlinked or unverified after submitting). Returns an
 * error message when blocked, or `null` when allowed.
 */
async function getCampaignAccessError(
  db: DbClient,
  discordId: string,
  campaignId: string,
): Promise<string | null> {
  const { data: campaign } = await db
    .from("campaigns")
    .select("platforms")
    .eq("id", campaignId)
    .maybeSingle();

  const platforms = (campaign?.platforms ?? []) as Platform[];

  let query = db
    .from("social_accounts")
    .select("platform")
    .eq("discord_id", discordId)
    .not("verified_at", "is", null);

  if (platforms.length > 0) {
    query = query.in("platform", platforms);
  }

  const { data: accounts } = await query;

  if (accounts && accounts.length > 0) return null;

  const labels =
    platforms.length > 0
      ? platforms.map((p) => PLATFORM_LABELS[p]).join(", ")
      : "a supported platform";

  return `You need a verified account on: ${labels} to submit to this campaign.`;
}

export function startQueuePoller(
  client: Client,
  db: DbClient,
  env: BotEnv,
): NodeJS.Timeout {
  const poll = async () => {
    const { data: items } = await db
      .from("submission_queue")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(5);

    for (const item of items ?? []) {
      const { data: claimed } = await db
        .from("submission_queue")
        .update({ status: "processing" })
        .eq("id", item.id)
        .eq("status", "pending")
        .select()
        .maybeSingle();

      if (!claimed) continue;

      const campaignTitle = await getCampaignTitle(db, item.campaign_id);

      const accessError = await getCampaignAccessError(db, item.discord_id, item.campaign_id);
      if (accessError) {
        await db
          .from("submission_queue")
          .update({
            status: "failed",
            error_message: accessError,
            processed_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        await sendSubmissionFailed(client, item.discord_id, {
          campaignTitle,
          url: item.url,
          error: accessError,
        });
        continue;
      }

      try {
        const result = await callWorker<VerifyVideoResult>(env, "/verify-video", {
          url: item.url,
          discordId: item.discord_id,
        });

        if (!result.ok) {
          await db
            .from("submission_queue")
            .update({
              status: "failed",
              error_message: result.error ?? "Verification failed",
              processed_at: new Date().toISOString(),
            })
            .eq("id", item.id);

          await sendSubmissionFailed(client, item.discord_id, {
            campaignTitle,
            url: item.url,
            error: result.error ?? "Unknown error",
            platform: result.platform as Platform | undefined,
            ownerHandle: result.ownerHandle,
            linkedHandle: result.linkedHandle,
            views: result.initialViews,
            metadata: result.metadata,
          });
          continue;
        }

        const metadata = result.metadata ?? { fetchedAt: new Date().toISOString() };

        const { data: clip, error: clipError } = await db
          .from("clips")
          .insert({
            campaign_id: item.campaign_id,
            discord_id: item.discord_id,
            platform: result.platform as Platform,
            video_id: result.videoId!,
            url: item.url,
            status: "pending",
            initial_views: result.initialViews ?? 0,
            current_views: result.initialViews ?? 0,
            owner_handle: result.ownerHandle,
            title: metadata.title,
            video_metadata: metadata as unknown as Json,
            metadata_fetched_at: metadata.fetchedAt,
          })
          .select("id")
          .single();

        if (clipError) {
          const isDuplicate = clipError.code === "23505";
          const errorMessage = isDuplicate
            ? "This video was already submitted to this campaign."
            : clipError.message;

          await db
            .from("submission_queue")
            .update({
              status: "failed",
              error_message: errorMessage,
              processed_at: new Date().toISOString(),
            })
            .eq("id", item.id);

          await sendSubmissionFailed(client, item.discord_id, {
            campaignTitle,
            url: item.url,
            error: errorMessage,
            platform: result.platform as Platform | undefined,
            ownerHandle: result.ownerHandle,
            views: result.initialViews,
            metadata,
          });
          continue;
        }

        try {
          await callWorker(env, "/sync-clip-media", { clipId: clip.id });
        } catch (err) {
          console.warn(`Thumbnail sync failed for clip ${clip.id}:`, err);
        }

        await db
          .from("submission_queue")
          .update({
            status: "completed",
            processed_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        await sendDm(client, item.discord_id, {
          embeds: [
            buildClipReviewEmbed({
              kind: "submitted",
              campaignTitle,
              platform: result.platform as Platform,
              url: item.url,
              ownerHandle: result.ownerHandle,
              views: result.initialViews ?? 0,
              metadata,
              clipTitle: metadata.title,
            }),
          ],
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Processing error";
        await db
          .from("submission_queue")
          .update({
            status: "failed",
            error_message: msg,
            processed_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        await sendSubmissionFailed(client, item.discord_id, {
          campaignTitle,
          url: item.url,
          error: msg,
        });
      }
    }
  };

  return setInterval(poll, env.QUEUE_POLL_INTERVAL_MS);
}
