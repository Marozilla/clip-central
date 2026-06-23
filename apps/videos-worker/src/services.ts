import type { ClipVideoMetadata } from "@clip-central/shared";
import {
  getAdapterForPlatform,
  handlesMatch,
  parseVideoUrl,
  videoStatsToMetadata,
  type VideoStats,
} from "@clip-central/platform-adapter";
import { mirrorClipThumbnail } from "@clip-central/storage";
import type { DbClient, Json } from "@clip-central/db";
import type { Platform } from "@clip-central/shared";
import {
  createPlatformAdapters,
  ScrapeCreatorsClient,
} from "@clip-central/platform-adapter";
import type { WorkerEnv } from "./config.js";
import { notifyCreator } from "./notify.js";

let refreshPaused = false;

export function pauseRefresh(): void {
  refreshPaused = true;
}
export function resumeRefresh(): void {
  refreshPaused = false;
}
export function isRefreshPaused(): boolean {
  return refreshPaused;
}

export function createWorkerServices(env: WorkerEnv, db: DbClient) {
  const client = new ScrapeCreatorsClient({
    apiKey: env.SCRAPECREATORS_API_KEY,
    requestDelayMs: env.REQUEST_DELAY_MS,
  });
  const adapters = createPlatformAdapters(client);

  return { client, adapters, db, env };
}

export type WorkerServices = ReturnType<typeof createWorkerServices>;

export async function verifyProfile(
  svc: WorkerServices,
  platform: Platform,
  handle: string,
  verificationCode: string,
): Promise<{ verified: boolean; reason?: string; followerCount?: number }> {
  pauseRefresh();
  try {
    const adapter = getAdapterForPlatform(svc.adapters, platform);
    const profile = await adapter.getProfile(handle);
    const verified = profile.bio.includes(verificationCode);
    return verified
      ? { verified: true, followerCount: profile.followerCount }
      : { verified: false, reason: "Verification code not found in profile bio" };
  } finally {
    resumeRefresh();
  }
}

export async function verifyVideo(
  svc: WorkerServices,
  videoUrl: string,
  discordId: string,
): Promise<{
  ok: boolean;
  videoId?: string;
  platform?: Platform;
  ownerHandle?: string;
  linkedHandle?: string;
  initialViews?: number;
  metadata?: ClipVideoMetadata;
  error?: string;
}> {
  pauseRefresh();
  try {
    const parsed = parseVideoUrl(videoUrl);
    if (!parsed) {
      return { ok: false, error: "Could not parse video URL. Supported: TikTok, YouTube, Instagram, Twitter/X." };
    }

    const { data: accounts } = await svc.db
      .from("social_accounts")
      .select("handle")
      .eq("discord_id", discordId)
      .eq("platform", parsed.platform)
      .not("verified_at", "is", null);

    if (!accounts?.length) {
      return {
        ok: false,
        platform: parsed.platform,
        error: `No verified ${parsed.platform} account linked. Connect your account first.`,
      };
    }

    const adapter = getAdapterForPlatform(svc.adapters, parsed.platform);
    const stats = await adapter.getVideo(parsed.videoId, videoUrl);

    if (stats.isDeleted) {
      return {
        ok: false,
        platform: parsed.platform,
        error: "Video not found or is private/deleted.",
      };
    }

    if (!stats.ownerHandle) {
      return {
        ok: false,
        platform: parsed.platform,
        error: "Could not determine video owner.",
      };
    }

    const matched = accounts.find((a: { handle: string }) =>
      handlesMatch(stats.ownerHandle, a.handle),
    );
    if (!matched) {
      const linked = accounts.map((a: { handle: string }) => `@${a.handle}`).join(", ");
      return {
        ok: false,
        platform: parsed.platform,
        videoId: parsed.videoId,
        ownerHandle: stats.ownerHandle,
        linkedHandle: accounts[0]?.handle,
        initialViews: stats.views,
        metadata: videoStatsToMetadata(stats),
        error: `Video owner (@${stats.ownerHandle}) does not match any of your linked ${parsed.platform} accounts (${linked}).`,
      };
    }

    return {
      ok: true,
      videoId: parsed.videoId,
      platform: parsed.platform,
      ownerHandle: stats.ownerHandle,
      initialViews: stats.views,
      metadata: videoStatsToMetadata(stats),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Verification failed";
    return { ok: false, error: msg };
  } finally {
    resumeRefresh();
  }
}

async function applyClipStats(
  svc: WorkerServices,
  clipId: string,
  stats: VideoStats,
  existing?: {
    thumbnail_path?: string | null;
    video_metadata?: unknown;
    title?: string | null;
  },
): Promise<void> {
  const metadata = videoStatsToMetadata(stats);
  const prevSource = (existing?.video_metadata as ClipVideoMetadata | null)?.thumbnailSource;
  let thumbnailPath = existing?.thumbnail_path ?? null;

  const source = stats.thumbnailUrl;
  if (source && source !== prevSource) {
    try {
      thumbnailPath = await mirrorClipThumbnail(
        svc.db,
        clipId,
        source,
        stats.thumbnailAlternates ?? [],
      );
    } catch (err) {
      console.warn(`Thumbnail mirror failed for clip ${clipId}:`, err);
    }
  } else if (source && !thumbnailPath) {
    try {
      thumbnailPath = await mirrorClipThumbnail(
        svc.db,
        clipId,
        source,
        stats.thumbnailAlternates ?? [],
      );
    } catch (err) {
      console.warn(`Thumbnail mirror failed for clip ${clipId}:`, err);
    }
  }

  await svc.db
    .from("clips")
    .update({
      current_views: stats.views,
      title: stats.title ?? existing?.title ?? undefined,
      video_metadata: metadata as unknown as Json,
      metadata_fetched_at: metadata.fetchedAt,
      thumbnail_path: thumbnailPath,
      thumbnail_url: null,
      failure_strikes: 0,
    })
    .eq("id", clipId);
}

export async function syncClipMedia(svc: WorkerServices, clipId: string): Promise<void> {
  const { data: clip, error } = await svc.db.from("clips").select("*").eq("id", clipId).single();
  if (error || !clip) throw new Error("Clip not found");

  const source = (clip.video_metadata as ClipVideoMetadata | null)?.thumbnailSource;
  if (!source) return;

  try {
    const thumbnailPath = await mirrorClipThumbnail(svc.db, clipId, source);
    await svc.db
      .from("clips")
      .update({ thumbnail_path: thumbnailPath, thumbnail_url: null })
      .eq("id", clipId);
  } catch (err) {
    console.warn(`Thumbnail mirror failed for clip ${clipId}:`, err);
  }
}

const DELETION_STRIKE_THRESHOLD = 3;

export async function refreshClip(
  svc: WorkerServices,
  clipId: string,
): Promise<{ views: number; deleted: boolean }> {
  const { data: clip, error } = await svc.db
    .from("clips")
    .select("*")
    .eq("id", clipId)
    .single();

  if (error || !clip) throw new Error("Clip not found");

  const adapter = getAdapterForPlatform(svc.adapters, clip.platform);
  const stats = await adapter.getVideo(clip.video_id, clip.url);

  if (stats.isDeleted) {
    const strikes = clip.failure_strikes + 1;
    if (strikes >= DELETION_STRIKE_THRESHOLD) {
      await svc.db
        .from("clips")
        .update({ status: "deleted", failure_strikes: strikes })
        .eq("id", clipId);
      await notifyCreator(
        svc.env,
        clip.discord_id,
        `Your clip "${clip.title ?? clip.url}" was marked as deleted after repeated fetch failures.`,
      );
      return { views: clip.current_views, deleted: true };
    }
    await svc.db.from("clips").update({ failure_strikes: strikes }).eq("id", clipId);
    return { views: clip.current_views, deleted: false };
  }

  await applyClipStats(svc, clipId, stats, clip);

  await svc.db.from("clip_view_history").insert({
    clip_id: clipId,
    views: stats.views,
  });

  return { views: stats.views, deleted: false };
}

export async function refreshActiveClips(svc: WorkerServices): Promise<{
  updated: number;
  failed: number;
  skipped: boolean;
}> {
  if (isRefreshPaused()) {
    return { updated: 0, failed: 0, skipped: true };
  }

  const { data: campaigns } = await svc.db
    .from("campaigns")
    .select("id")
    .eq("status", "active");

  if (!campaigns?.length) return { updated: 0, failed: 0, skipped: false };

  const campaignIds = campaigns.map((c) => c.id);

  const { data: clips } = await svc.db
    .from("clips")
    .select("*")
    .in("campaign_id", campaignIds)
    .in("status", ["pending", "approved", "tracking"]);

  if (!clips?.length) return { updated: 0, failed: 0, skipped: false };

  let updated = 0;
  let failed = 0;
  const failuresByPlatform: Record<string, number> = {};

  for (const clip of clips) {
    try {
      await refreshClip(svc, clip.id);
      updated++;
    } catch {
      failed++;
      failuresByPlatform[clip.platform] = (failuresByPlatform[clip.platform] ?? 0) + 1;
    }
  }

  for (const [platform, fails] of Object.entries(failuresByPlatform)) {
    const platformClips = clips.filter((c) => c.platform === platform).length;
    if (platformClips > 0 && fails / platformClips > 0.5) {
      console.warn(
        `Circuit breaker: >50% failures for ${platform}, skipping mass deletion`,
      );
    }
  }

  await svc.db
    .from("worker_heartbeat")
    .upsert({ id: "main", last_seen_at: new Date().toISOString() });

  return { updated, failed, skipped: false };
}

export async function refreshCampaignClips(
  svc: WorkerServices,
  campaignId: string,
): Promise<{ updated: number; failed: number }> {
  const { data: clips } = await svc.db
    .from("clips")
    .select("id")
    .eq("campaign_id", campaignId)
    .in("status", ["pending", "approved", "tracking"]);

  let updated = 0;
  let failed = 0;

  for (const clip of clips ?? []) {
    try {
      await refreshClip(svc, clip.id);
      updated++;
    } catch {
      failed++;
    }
  }

  return { updated, failed };
}
