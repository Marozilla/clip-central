"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Clip } from "@clip-central/db";
import {
  allocateCampaignPayouts,
  computeEarnings,
  formatCurrency,
  formatNumber,
  getClipThumbnailUrl,
  PLATFORM_LABELS,
} from "@clip-central/shared";
import { Card, EmptyState, StatusBadge } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { RejectClipDialog } from "@/components/reject-clip-dialog";
import { SubmitterCell, type ClipSubmitter } from "@/components/submitter-cell";

export type ClipWithSubmitter = Clip & { submitter?: ClipSubmitter | null };

type ApiClipResponse = Clip & { dm?: { ok: boolean; error?: string } };

const platformColors: Record<string, string> = {
  tiktok: "text-white bg-white/10",
  youtube: "text-red-400 bg-red-500/10",
  instagram: "text-pink-400 bg-pink-500/10",
  twitter: "text-sky-400 bg-sky-500/10",
};

function ClipThumbnail({ clip }: { clip: ClipWithSubmitter }) {
  if (!clip.thumbnail_path) {
    return <div className="h-12 w-[68px] shrink-0 rounded-lg bg-white/5 ring-1 ring-white/10" />;
  }
  return (
    <img
      src={getClipThumbnailUrl(clip.id)}
      alt=""
      className="h-12 w-[68px] shrink-0 rounded-lg object-cover ring-1 ring-white/10"
    />
  );
}

export function ClipTable({
  clips,
  cpm,
  minViewsForPayout = 0,
  budgetCap = null,
}: {
  clips: ClipWithSubmitter[];
  cpm: number;
  minViewsForPayout?: number;
  budgetCap?: number | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ClipWithSubmitter | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "warning"; text: string } | null>(null);

  // Budget-capped earnings owed per payable clip (first-come, first-served).
  const payouts = useMemo(
    () => allocateCampaignPayouts(clips, cpm, minViewsForPayout, budgetCap),
    [clips, cpm, minViewsForPayout, budgetCap],
  );

  function earningsFor(clip: ClipWithSubmitter): number {
    // Payable clips use the capped allocation; others show a (potential) preview.
    return (
      payouts.perClip[clip.id] ??
      computeEarnings(
        Number(clip.current_views),
        Number(clip.initial_views),
        cpm,
        minViewsForPayout,
      )
    );
  }

  function handleDmResult(data: ApiClipResponse, successLabel: string) {
    if (data.dm?.ok === false) {
      setNotice({
        type: "warning",
        text: `${successLabel}, but Discord DM failed: ${data.dm.error ?? "unknown error"}`,
      });
    } else {
      setNotice({ type: "success", text: `${successLabel} — creator notified on Discord.` });
    }
  }

  async function approve(clipId: string) {
    setLoading(`approve-${clipId}`);
    setNotice(null);
    const res = await fetch(`/api/clips/${clipId}/approve`, { method: "POST" });
    const data = (await res.json()) as ApiClipResponse;
    setLoading(null);
    if (res.ok) {
      handleDmResult(data, "Clip approved");
      setRejectTarget(null);
    }
    router.refresh();
  }

  async function reject(clipId: string, reason: string) {
    setLoading(`reject-${clipId}`);
    setNotice(null);
    const res = await fetch(`/api/clips/${clipId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() || undefined }),
    });
    const data = (await res.json()) as ApiClipResponse;
    setLoading(null);
    if (res.ok) {
      handleDmResult(data, "Clip rejected");
      setRejectTarget(null);
    }
    router.refresh();
  }

  async function refresh(clipId: string) {
    setLoading(`refresh-${clipId}`);
    await fetch(`/api/clips/${clipId}/refresh`, { method: "POST" });
    setLoading(null);
    router.refresh();
  }

  if (!clips.length) {
    return (
      <Card>
        <EmptyState
          title="No clips yet"
          description="Clips appear here when creators submit through Discord."
        />
      </Card>
    );
  }

  return (
    <>
      {notice && (
        <div
          className={`mb-4 rounded-xl px-4 py-3 text-sm ${
            notice.type === "warning"
              ? "bg-cc-orange/10 text-cc-orange ring-1 ring-cc-orange/25"
              : "bg-cc-green/10 text-cc-green ring-1 ring-cc-green/25"
          }`}
        >
          {notice.text}
        </div>
      )}

      <RejectClipDialog
        open={!!rejectTarget}
        clipTitle={rejectTarget?.title ?? rejectTarget?.video_id}
        loading={!!rejectTarget && loading === `reject-${rejectTarget.id}`}
        onCancel={() => setRejectTarget(null)}
        onConfirm={(reason) => rejectTarget && reject(rejectTarget.id, reason)}
      />

      <div className="flex flex-col gap-3 md:hidden">
        {clips.map((clip) => (
          <ClipMobileCard
            key={clip.id}
            clip={clip}
            earnings={earningsFor(clip)}
            minViewsForPayout={minViewsForPayout}
            loading={loading}
            onApprove={approve}
            onReject={setRejectTarget}
            onRefresh={refresh}
          />
        ))}
      </div>

      <Card className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] font-semibold uppercase tracking-widest text-white/35">
                <th className="px-4 py-4 lg:px-6">Submitter</th>
                <th className="px-4 py-4 lg:px-6">Thumbnail</th>
                <th className="px-4 py-4 lg:px-6">Platform</th>
                <th className="px-4 py-4 lg:px-6">Clip</th>
                <th className="px-4 py-4 lg:px-6">Views</th>
                <th className="px-4 py-4 lg:px-6">Earned</th>
                <th className="px-4 py-4 lg:px-6">Status</th>
                <th className="px-4 py-4 lg:px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clips.map((clip) => (
                <ClipTableRow
                  key={clip.id}
                  clip={clip}
                  earnings={earningsFor(clip)}
                  minViewsForPayout={minViewsForPayout}
                  loading={loading}
                  onApprove={approve}
                  onReject={setRejectTarget}
                  onRefresh={refresh}
                />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function ClipTableRow({
  clip,
  earnings,
  minViewsForPayout,
  loading,
  onApprove,
  onReject,
  onRefresh,
}: {
  clip: ClipWithSubmitter;
  earnings: number;
  minViewsForPayout: number;
  loading: string | null;
  onApprove: (id: string) => void;
  onReject: (clip: ClipWithSubmitter) => void;
  onRefresh: (id: string) => void;
}) {
  const gained = Math.max(0, Number(clip.current_views) - Number(clip.initial_views));
  const unpaidRemaining = Math.max(0, minViewsForPayout - gained);

  return (
    <tr className="table-row-hover border-b border-white/[0.04] last:border-0">
      <td className="px-4 py-4 lg:px-6">
        <SubmitterCell submitter={clip.submitter} ownerHandle={clip.owner_handle} />
      </td>
      <td className="px-4 py-4 lg:px-6">
        <ClipThumbnail clip={clip} />
      </td>
      <td className="px-4 py-4 lg:px-6">
        <span className={`inline-flex rounded-lg px-2 py-1 text-[11px] font-semibold ${platformColors[clip.platform] ?? "bg-white/5"}`}>
          {PLATFORM_LABELS[clip.platform]}
        </span>
      </td>
      <td className="max-w-[180px] px-4 py-4 lg:px-6">
        <a href={clip.url} target="_blank" rel="noopener noreferrer" className="block truncate font-medium text-white/80 hover:text-cc-blue">
          {clip.title ?? clip.video_id}
        </a>
      </td>
      <td className="px-4 py-4 lg:px-6">
        <span className="font-semibold text-white">{formatNumber(Number(clip.current_views))}</span>
        {gained > 0 && <span className="ml-1.5 text-[11px] font-medium text-cc-green">+{formatNumber(gained)}</span>}
        {unpaidRemaining > 0 && (
          <span className="ml-1.5 text-[11px] font-medium text-white/35">
            {formatNumber(unpaidRemaining)} to payout
          </span>
        )}
      </td>
      <td className="px-4 py-4 font-mono text-xs font-semibold text-cc-gold lg:px-6">{formatCurrency(earnings)}</td>
      <td className="px-4 py-4 lg:px-6">
        <StatusBadge status={clip.status} />
      </td>
      <td className="px-4 py-4 lg:px-6">
        <ClipActions
          clip={clip}
          loading={loading}
          onApprove={onApprove}
          onReject={() => onReject(clip)}
          onRefresh={onRefresh}
        />
      </td>
    </tr>
  );
}

function ClipMobileCard({
  clip,
  earnings,
  minViewsForPayout,
  loading,
  onApprove,
  onReject,
  onRefresh,
}: {
  clip: ClipWithSubmitter;
  earnings: number;
  minViewsForPayout: number;
  loading: string | null;
  onApprove: (id: string) => void;
  onReject: (clip: ClipWithSubmitter) => void;
  onRefresh: (id: string) => void;
}) {
  const delta = Math.max(0, Number(clip.current_views) - Number(clip.initial_views));
  const unpaidRemaining = Math.max(0, minViewsForPayout - delta);

  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <SubmitterCell submitter={clip.submitter} ownerHandle={clip.owner_handle} />
        <StatusBadge status={clip.status} />
      </div>
      <div className="mb-3">
        <ClipThumbnail clip={clip} />
      </div>
      <div className="mb-2">
        <span className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${platformColors[clip.platform] ?? "bg-white/5"}`}>
          {PLATFORM_LABELS[clip.platform]}
        </span>
      </div>
      <a href={clip.url} target="_blank" rel="noopener noreferrer" className="mb-4 block text-sm font-medium leading-snug text-white/90 hover:text-cc-blue">
        {clip.title ?? clip.video_id}
      </a>
      <div className="mb-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-white/30">Views</p>
          <p className="mt-0.5 font-semibold text-white">
            {formatNumber(Number(clip.current_views))}
            {delta > 0 && <span className="ml-1 text-cc-green">+{formatNumber(delta)}</span>}
          </p>
          {unpaidRemaining > 0 && (
            <p className="mt-0.5 text-[11px] text-white/35">{formatNumber(unpaidRemaining)} to payout</p>
          )}
        </div>
        <div>
          <p className="text-white/30">Earned</p>
          <p className="mt-0.5 font-mono font-semibold text-cc-gold">{formatCurrency(earnings)}</p>
        </div>
      </div>
      <ClipActions
        clip={clip}
        loading={loading}
        onApprove={onApprove}
        onReject={() => onReject(clip)}
        onRefresh={onRefresh}
        fullWidth
      />
    </div>
  );
}

function ClipActions({
  clip,
  loading,
  onApprove,
  onReject,
  onRefresh,
  fullWidth,
}: {
  clip: Clip;
  loading: string | null;
  onApprove: (id: string) => void;
  onReject: () => void;
  onRefresh: (id: string) => void;
  fullWidth?: boolean;
}) {
  const canApprove = clip.status !== "approved" && clip.status !== "deleted";
  const canReject = clip.status !== "rejected" && clip.status !== "deleted";

  return (
    <div className="flex flex-wrap gap-2">
      {canApprove && (
        <Button
          variant="success"
          size="sm"
          disabled={!!loading}
          className={fullWidth ? "min-w-0 flex-1" : ""}
          onClick={() => onApprove(clip.id)}
        >
          {loading === `approve-${clip.id}` ? "…" : "Approve"}
        </Button>
      )}
      {canReject && (
        <Button
          variant="danger"
          size="sm"
          disabled={!!loading}
          className={fullWidth ? "min-w-0 flex-1" : ""}
          onClick={onReject}
        >
          {loading === `reject-${clip.id}` ? "…" : "Reject"}
        </Button>
      )}
      <Button variant="ghost" size="sm" disabled={!!loading} onClick={() => onRefresh(clip.id)}>
        {loading === `refresh-${clip.id}` ? "…" : "↻"}
      </Button>
    </div>
  );
}
