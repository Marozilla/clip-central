"use client";

import type { Clip } from "@clip-central/db";
import { Button } from "@/components/ui/button";
import type { ClipSubmitter } from "@/components/submitter-cell";
import {
  buildCampaignClipsCsv,
  csvFilename,
  downloadCsv,
} from "@/lib/campaign-csv-export";

export type ClipExportRow = Clip & {
  submitter?: ClipSubmitter | null;
  followerCount: number | null;
};

type Props = {
  campaignTitle: string;
  clips: ClipExportRow[];
  cpm: number;
  minViewsForPayout: number;
  budgetCap: number | null;
};

export function CampaignCsvExport({
  campaignTitle,
  clips,
  cpm,
  minViewsForPayout,
  budgetCap,
}: Props) {
  function handleExport() {
    if (clips.length === 0) return;
    const csv = buildCampaignClipsCsv(clips, cpm, minViewsForPayout, budgetCap);
    downloadCsv(csvFilename(campaignTitle), csv);
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleExport} disabled={clips.length === 0}>
      Export CSV
    </Button>
  );
}
