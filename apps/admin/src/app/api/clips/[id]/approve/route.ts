import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { clipReviewNotification, sendClipReviewDm } from "@/lib/discord-notify";
import { getDb } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const db = getDb();

  const { data: existing } = await db.from("clips").select("*").eq("id", id).single();
  if (!existing) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  const { data, error: updateError } = await db
    .from("clips")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reject_reason: null,
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { data: campaign } = await db
    .from("campaigns")
    .select("title")
    .eq("id", existing.campaign_id)
    .single();

  const dm = await sendClipReviewDm(
    existing.discord_id,
    clipReviewNotification(existing, campaign?.title ?? "Campaign", "approved"),
  );

  return NextResponse.json({ ...data, dm });
}
