import { allocateCampaignPayouts, computeEarnings } from "@clip-central/shared";
import type { ClipExportRow } from "@/components/campaign-csv-export";

const HEADERS = [
  "Account Username",
  "Follower Count",
  "Clip Link",
  "Discord Username",
  "Earnings",
] as const;

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value == null || value === "") return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function earningsForClip(
  clip: ClipExportRow,
  cpm: number,
  minViewsForPayout: number,
  payouts: ReturnType<typeof allocateCampaignPayouts>,
): number {
  const isPayable = clip.status === "approved" || clip.status === "tracking";
  if (!isPayable) return 0;
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

export function buildCampaignClipsCsv(
  clips: ClipExportRow[],
  cpm: number,
  minViewsForPayout: number,
  budgetCap: number | null,
): string {
  const payouts = allocateCampaignPayouts(clips, cpm, minViewsForPayout, budgetCap);

  const rows = clips.map((clip) => {
    const username = clip.owner_handle?.replace(/^@/, "") ?? "";
    const earnings = earningsForClip(clip, cpm, minViewsForPayout, payouts);

    return [
      escapeCsvCell(username),
      escapeCsvCell(clip.followerCount ?? ""),
      escapeCsvCell(clip.url),
      escapeCsvCell(clip.submitter?.discord_username ?? ""),
      escapeCsvCell(earnings.toFixed(2)),
    ].join(",");
  });

  return [HEADERS.join(","), ...rows].join("\r\n");
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function csvFilename(campaignTitle: string): string {
  const slug = campaignTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  const date = new Date().toISOString().slice(0, 10);
  return `${slug || "campaign"}-clips-${date}.csv`;
}
