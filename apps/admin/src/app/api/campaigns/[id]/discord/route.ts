import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { publishCampaignToDiscord } from "@/lib/discord-campaign";
import { getDb } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const db = getDb();

  const { data: campaign } = await db.from("campaigns").select("*").eq("id", id).single();
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (!campaign.discord_channel_id) {
    return NextResponse.json(
      { error: "Set a Discord channel on this campaign first" },
      { status: 400 },
    );
  }

  const result = await publishCampaignToDiscord(db, id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json(result);
}
