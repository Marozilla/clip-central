import {
  fetchCampaignPayoutSettings,
  fetchUserPayableClips,
  fetchUserStatsSummary,
  type DbClient,
} from "@clip-central/db";
import { allocateCampaignPayouts } from "@clip-central/shared";

export type UserStats = {
  campaignTitle: string;
  approvedClips: number;
  totalViewsGained: number;
  totalEarnings: number;
};

export async function fetchUserStats(
  db: DbClient,
  discordId: string,
  campaignId: string,
): Promise<UserStats> {
  const { data: campaign, error: campaignError } = await db
    .from("campaigns")
    .select("title")
    .eq("id", campaignId)
    .maybeSingle();

  if (campaignError) throw new Error(campaignError.message);
  if (!campaign) throw new Error("Campaign not found.");

  const summary = await fetchUserStatsSummary(db, discordId, campaignId);
  const clips = await fetchUserPayableClips(db, discordId, campaignId);
  const campaignMap = await fetchCampaignPayoutSettings(db, [campaignId]);
  const camp = campaignMap.get(campaignId);

  let totalEarnings = 0;
  if (camp) {
    const { total } = allocateCampaignPayouts(
      clips,
      Number(camp.rate_per_view),
      Number(camp.min_views_for_payout ?? 0),
      camp.budget_cap,
    );
    totalEarnings = total;
  }

  return {
    campaignTitle: campaign.title,
    ...summary,
    totalEarnings,
  };
}
