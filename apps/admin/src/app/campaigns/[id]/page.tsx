import { Suspense } from "react";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { CampaignActions } from "@/components/campaign-actions";
import { CampaignCsvExport, type ClipExportRow } from "@/components/campaign-csv-export";
import { ClipTable } from "@/components/clip-table";
import { getDb } from "@/lib/db";
import { allocateCampaignPayouts, formatCpm, formatCurrency, formatNumber, normalizeHandle } from "@clip-central/shared";
import { Card, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import type { ClipWithSubmitter } from "@/components/clip-table";

type Props = { params: Promise<{ id: string }> };

export default async function CampaignDetailPage({ params }: Props) {
  await requireSession();
  const { id } = await params;
  const db = getDb();

  const { data: campaign } = await db.from("campaigns").select("*").eq("id", id).single();
  if (!campaign) {
    return (
      <div className="py-20 text-center">
        <p className="text-white/50">Campaign not found.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-cc-blue hover:underline">
          Back to campaigns
        </Link>
      </div>
    );
  }

  const { data: clips } = await db
    .from("clips")
    .select("*")
    .eq("campaign_id", id)
    .order("submitted_at", { ascending: false });

  const clipsWithSubmitters: ClipWithSubmitter[] = await Promise.all(
    (clips ?? []).map(async (clip) => {
      const { data: submitter } = await db
        .from("users")
        .select("discord_id, discord_username, discord_avatar")
        .eq("discord_id", clip.discord_id)
        .maybeSingle();
      return { ...clip, submitter };
    }),
  );

  const discordIds = [...new Set(clipsWithSubmitters.map((c) => c.discord_id))];
  const { data: socialAccounts } = discordIds.length
    ? await db
        .from("social_accounts")
        .select("discord_id, platform, handle, follower_count")
        .in("discord_id", discordIds)
        .not("verified_at", "is", null)
    : { data: [] as { discord_id: string; platform: string; handle: string; follower_count: number | null }[] };

  function followerCountFor(clip: ClipWithSubmitter): number | null {
    const match = socialAccounts?.find(
      (a) =>
        a.discord_id === clip.discord_id &&
        a.platform === clip.platform &&
        clip.owner_handle &&
        normalizeHandle(clip.owner_handle) === normalizeHandle(a.handle),
    );
    return match?.follower_count ?? null;
  }

  const clipsForExport: ClipExportRow[] = clipsWithSubmitters.map((clip) => ({
    ...clip,
    followerCount: followerCountFor(clip),
  }));

  const pendingCount = clipsWithSubmitters.filter((c) => c.status === "pending").length;
  const totalViews = clipsWithSubmitters.reduce((sum, c) => sum + Number(c.current_views), 0);
  const minViewsForPayout = Number(campaign.min_views_for_payout ?? 0);
  const budgetCap = campaign.budget_cap == null ? null : Number(campaign.budget_cap);
  // Cap total owed at the campaign budget so payout never exceeds it.
  const payouts = allocateCampaignPayouts(
    clipsWithSubmitters,
    Number(campaign.rate_per_view),
    minViewsForPayout,
    budgetCap,
  );
  const totalEarnings = payouts.total;

  return (
    <div>
      <PageHeader
        title={campaign.title}
        description={campaign.description ?? undefined}
        backHref="/"
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge status={campaign.status} />
        {campaign.discord_message_id && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cc-green/10 px-3 py-1 text-xs font-medium text-cc-green ring-1 ring-cc-green/25">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cc-green" />
            Live in Discord
          </span>
        )}
        {minViewsForPayout > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 text-xs font-medium text-white/60 ring-1 ring-white/10">
            Min {formatNumber(minViewsForPayout)} views before payout
          </span>
        )}
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          label="CPM"
          value={formatCpm(Number(campaign.rate_per_view))}
          sub="per 1,000 views"
          accent="blue"
        />
        <StatCard label="Total Views" value={formatNumber(totalViews)} accent="green" />
        <StatCard
          label="Est. Payout"
          value={formatCurrency(totalEarnings)}
          sub={
            budgetCap == null
              ? "no budget cap"
              : payouts.capped
                ? `${formatCurrency(budgetCap)} budget reached`
                : `of ${formatCurrency(budgetCap)} budget`
          }
          accent="gold"
        />
        <StatCard
          label="Pending Review"
          value={pendingCount}
          sub={`${clips?.length ?? 0} total clips`}
          accent="orange"
        />
      </div>

      <div className="mb-8 w-full">
        <Suspense fallback={null}>
          <CampaignActions
            campaignId={id}
            status={campaign.status}
            discordMessageId={campaign.discord_message_id}
            discordChannelId={campaign.discord_channel_id}
          />
        </Suspense>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-white">Submissions</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/35">{clipsWithSubmitters.length} clips</span>
          <CampaignCsvExport
            campaignTitle={campaign.title}
            clips={clipsForExport}
            cpm={Number(campaign.rate_per_view)}
            minViewsForPayout={minViewsForPayout}
            budgetCap={budgetCap}
          />
        </div>
      </div>

      <ClipTable
        clips={clipsWithSubmitters}
        cpm={Number(campaign.rate_per_view)}
        minViewsForPayout={minViewsForPayout}
        budgetCap={budgetCap}
      />
    </div>
  );
}
