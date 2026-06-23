import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import { formatCpm } from "@clip-central/shared";
import type { Campaign } from "@clip-central/db";
import { Card, EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  await requireSession();
  const db = getDb();

  const { data: campaigns } = await db
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  const clipCounts: Record<string, number> = {};
  let totalClips = 0;
  let activeCount = 0;

  for (const c of campaigns ?? []) {
    if (c.status === "active") activeCount++;
    const { count } = await db
      .from("clips")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", c.id);
    clipCounts[c.id] = count ?? 0;
    totalClips += count ?? 0;
  }

  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Manage clipping campaigns, track submissions, and monitor performance."
        actionHref="/campaigns/new"
        actionLabel="New Campaign"
      />

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label="Total Campaigns" value={campaigns?.length ?? 0} accent="blue" />
        <StatCard label="Active Now" value={activeCount} accent="green" sub="Live in Discord" />
        <StatCard label="Total Clips" value={totalClips} accent="gold" sub="All submissions" />
      </div>

      {!campaigns?.length ? (
        <Card>
          <EmptyState
            title="No campaigns yet"
            description="Launch your first clipping campaign and post it straight to Discord."
            action={
              <Link href="/campaigns/new">
                <Button size="lg" className="w-full sm:w-auto">
                  Create Campaign
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="flex flex-col gap-3 md:hidden">
            {campaigns.map((c) => (
              <CampaignMobileCard key={c.id} campaign={c} clipCount={clipCounts[c.id] ?? 0} />
            ))}
          </div>

          {/* Desktop: table */}
          <Card className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] font-semibold uppercase tracking-widest text-white/35">
                    <th className="px-4 py-4 lg:px-6">Campaign</th>
                    <th className="px-4 py-4 lg:px-6">Status</th>
                    <th className="px-4 py-4 lg:px-6">CPM</th>
                    <th className="px-4 py-4 lg:px-6">Clips</th>
                    <th className="px-4 py-4 lg:px-6">Ends</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id} className="table-row-hover border-b border-white/[0.04] last:border-0">
                      <td className="px-4 py-4 lg:px-6">
                        <Link href={`/campaigns/${c.id}`} className="group flex flex-col">
                          <span className="font-medium text-white transition-colors group-hover:text-cc-blue">
                            {c.title}
                          </span>
                          {c.description && (
                            <span className="mt-0.5 max-w-xs truncate text-xs text-white/30">
                              {c.description}
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-4 lg:px-6">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-white/70 lg:px-6">
                        {formatCpm(Number(c.rate_per_view))}
                      </td>
                      <td className="px-4 py-4 lg:px-6">
                        <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-lg bg-white/[0.05] px-2 text-xs font-semibold text-white/70">
                          {clipCounts[c.id] ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-white/40 lg:px-6">
                        {c.ends_at
                          ? new Date(c.ends_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function CampaignMobileCard({ campaign, clipCount }: { campaign: Campaign; clipCount: number }) {
  return (
    <Link href={`/campaigns/${campaign.id}`} className="block">
      <div className="glass rounded-2xl p-4 transition-all active:scale-[0.99] active:bg-white/[0.05]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-white">{campaign.title}</h3>
            {campaign.description && (
              <p className="mt-1 line-clamp-2 text-xs text-white/40">{campaign.description}</p>
            )}
          </div>
          <StatusBadge status={campaign.status} />
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-white/50">
          <span>
            <span className="text-white/30">CPM </span>
            <span className="font-mono text-white/70">{formatCpm(Number(campaign.rate_per_view))}</span>
          </span>
          <span>
            <span className="text-white/30">Clips </span>
            <span className="font-semibold text-white/70">{clipCount}</span>
          </span>
          {campaign.ends_at && (
            <span>
              <span className="text-white/30">Ends </span>
              {new Date(campaign.ends_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
