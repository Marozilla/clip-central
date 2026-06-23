import type { ClipStatus, DbClient } from "./index.js";

export type UserClipRow = {
  id: string;
  title: string | null;
  url: string;
  status: ClipStatus;
  platform: string;
  current_views: number;
  submitted_at: string;
  campaignTitle: string | null;
};

export type UserClipsPage = {
  campaignId: string;
  clips: UserClipRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
};

export type UserStatsSummary = {
  approvedClips: number;
  totalViewsGained: number;
};

export type PayableClipForEarnings = {
  id: string;
  status: string;
  current_views: number;
  initial_views: number;
  submitted_at: string;
  campaign_id: string;
};

export const USER_CLIPS_PAGE_SIZE = 10;

export async function fetchUserStatsSummary(
  db: DbClient,
  discordId: string,
  campaignId: string,
): Promise<UserStatsSummary> {
  const { data: clips, error } = await db
    .from("clips")
    .select("status, current_views, initial_views")
    .eq("discord_id", discordId)
    .eq("campaign_id", campaignId)
    .neq("status", "deleted");

  if (error) throw new Error(error.message);

  let approvedClips = 0;
  let totalViewsGained = 0;

  for (const clip of clips ?? []) {
    if (clip.status !== "approved" && clip.status !== "tracking") continue;
    approvedClips++;
    totalViewsGained += Math.max(
      0,
      Number(clip.current_views) - Number(clip.initial_views),
    );
  }

  return { approvedClips, totalViewsGained };
}

export async function fetchUserPayableClips(
  db: DbClient,
  discordId: string,
  campaignId: string,
): Promise<PayableClipForEarnings[]> {
  const { data: clips, error } = await db
    .from("clips")
    .select("id, status, current_views, initial_views, submitted_at, campaign_id")
    .eq("discord_id", discordId)
    .eq("campaign_id", campaignId)
    .in("status", ["approved", "tracking"]);

  if (error) throw new Error(error.message);

  return (clips ?? []).map((clip) => ({
    id: clip.id,
    status: clip.status,
    current_views: Number(clip.current_views),
    initial_views: Number(clip.initial_views),
    submitted_at: clip.submitted_at,
    campaign_id: clip.campaign_id,
  }));
}

export async function fetchCampaignPayoutSettings(
  db: DbClient,
  campaignIds: string[],
): Promise<
  Map<string, { rate_per_view: number; min_views_for_payout: number; budget_cap: number | null }>
> {
  const campaignMap = new Map<
    string,
    { rate_per_view: number; min_views_for_payout: number; budget_cap: number | null }
  >();

  if (campaignIds.length === 0) return campaignMap;

  const { data: campaigns, error } = await db
    .from("campaigns")
    .select("id, rate_per_view, min_views_for_payout, budget_cap")
    .in("id", campaignIds);

  if (error) throw new Error(error.message);

  for (const campaign of campaigns ?? []) {
    campaignMap.set(campaign.id, campaign);
  }

  return campaignMap;
}

export async function fetchUserClipsPage(
  db: DbClient,
  discordId: string,
  campaignId: string,
  page: number,
  pageSize = USER_CLIPS_PAGE_SIZE,
): Promise<UserClipsPage> {
  const safePage = Math.max(0, page);
  const from = safePage * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await db
    .from("clips")
    .select("id, title, url, status, platform, current_views, submitted_at, campaign_id", {
      count: "exact",
    })
    .eq("discord_id", discordId)
    .eq("campaign_id", campaignId)
    .neq("status", "deleted")
    .order("submitted_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  const totalCount = count ?? 0;
  const clips: UserClipRow[] = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    url: row.url,
    status: row.status,
    platform: row.platform,
    current_views: Number(row.current_views),
    submitted_at: row.submitted_at,
    campaignTitle: null,
  }));

  return {
    campaignId,
    clips,
    page: safePage,
    pageSize,
    totalCount,
    hasMore: from + clips.length < totalCount,
  };
}
