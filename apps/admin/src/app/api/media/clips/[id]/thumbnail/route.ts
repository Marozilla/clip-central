import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getDb } from "@/lib/db";
import { downloadClipAsset } from "@clip-central/storage/download";

type Params = { params: Promise<{ id: string }> };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid clip id" }, { status: 400 });
  }

  const db = getDb();
  const { data: clip } = await db
    .from("clips")
    .select("thumbnail_path")
    .eq("id", id)
    .maybeSingle();

  if (!clip?.thumbnail_path) {
    return NextResponse.json({ error: "Thumbnail not found" }, { status: 404 });
  }

  const asset = await downloadClipAsset(db, clip.thumbnail_path);
  if (!asset) {
    return NextResponse.json({ error: "Thumbnail unavailable" }, { status: 404 });
  }

  const buffer = Buffer.from(await asset.data.arrayBuffer());

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": asset.contentType,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
