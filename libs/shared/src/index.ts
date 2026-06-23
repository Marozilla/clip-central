export type Platform = "youtube" | "tiktok" | "instagram" | "twitter";

/** Snapshot stored on clips.video_metadata after each Scrape Creators fetch */
export interface ClipVideoMetadata {
  fetchedAt: string;
  title?: string;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  durationSeconds?: number;
  publishedAt?: string;
  authorDisplayName?: string;
  /** Last remote thumbnail URL — used internally to detect changes before re-mirror */
  thumbnailSource?: string;
}

/** Payload for clip review DMs (submitted / approved / rejected / failed) */
export type ClipReviewKind = "submitted" | "approved" | "rejected" | "failed";

export interface ClipReviewNotification {
  kind: ClipReviewKind;
  campaignTitle: string;
  url: string;
  /** Shown on failed submissions */
  error?: string | null;
  platform?: Platform;
  /** Handle on the video */
  ownerHandle?: string | null;
  /** Submitter's linked handle — useful on owner-mismatch errors */
  linkedHandle?: string | null;
  views?: number;
  metadata?: ClipVideoMetadata;
  rejectReason?: string | null;
  clipTitle?: string | null;
}

/** Admin-only proxied thumbnail — never exposes Supabase storage URLs */
export function getClipThumbnailUrl(clipId: string): string {
  return `/api/media/clips/${clipId}/thumbnail`;
}

export const PLATFORMS: Platform[] = ["youtube", "tiktok", "instagram", "twitter"];

export const PLATFORM_LABELS: Record<Platform, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
  twitter: "Twitter/X",
};

export function normalizeHandle(handle: string): string {
  return handle.replace(/^@/, "").trim().toLowerCase();
}

export function generateVerificationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Earnings for a single clip.
 *
 * `minViewsForPayout` is a campaign threshold: the first N views a clip gains
 * after submission are unpaid. Payout only begins once the clip passes
 * `initialViews + minViewsForPayout`. Example: submitted at 500 views with a
 * 1,000 minimum starts earning at 1,500 views.
 */
export function computeEarnings(
  currentViews: number,
  initialViews: number,
  /** CPM — dollars per 1,000 views */
  cpm: number,
  minViewsForPayout = 0,
): number {
  const payableViews = payableViewDelta(currentViews, initialViews, minViewsForPayout);
  return (payableViews / 1000) * cpm;
}

/** Views that count toward payout after the initial + minimum threshold. */
export function payableViewDelta(
  currentViews: number,
  initialViews: number,
  minViewsForPayout = 0,
): number {
  return Math.max(0, currentViews - initialViews - Math.max(0, minViewsForPayout));
}

export interface PayoutClip {
  id: string;
  status: string;
  current_views: number;
  initial_views: number;
  submitted_at: string;
}

export interface CampaignPayout {
  /** Capped earnings owed per clip id (only payable clips appear) */
  perClip: Record<string, number>;
  /** Total owed across the campaign — never exceeds budgetCap */
  total: number;
  /** True when the budget cap clipped at least one payout */
  capped: boolean;
}

/**
 * Allocate a campaign's budget across its payable clips in submission order
 * (first-come, first-served). Guarantees the campaign never reports owing more
 * than `budgetCap`. Pass `null`/`undefined` budgetCap for uncapped campaigns.
 */
export function allocateCampaignPayouts(
  clips: PayoutClip[],
  cpm: number,
  minViewsForPayout = 0,
  budgetCap?: number | null,
): CampaignPayout {
  const payable = clips
    .filter((c) => c.status === "approved" || c.status === "tracking")
    .sort(
      (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime(),
    );

  const perClip: Record<string, number> = {};
  let total = 0;
  let capped = false;
  let remaining = budgetCap == null ? Infinity : Math.max(0, budgetCap);

  for (const clip of payable) {
    const raw = computeEarnings(
      Number(clip.current_views),
      Number(clip.initial_views),
      cpm,
      minViewsForPayout,
    );
    const paid = Math.min(raw, remaining);
    if (paid < raw) capped = true;
    perClip[clip.id] = paid;
    total += paid;
    remaining -= paid;
  }

  return { perClip, total, capped };
}

/** Format stored rate as CPM for display */
export function formatCpm(cpm: number): string {
  return `${formatCurrency(cpm)}/1K views`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export { resolveServiceUrl, type ResolveServiceUrlInput } from "./service-url.js";
