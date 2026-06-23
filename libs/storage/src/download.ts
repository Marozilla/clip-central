import type { DbClient } from "@clip-central/db";
import { CLIP_ASSETS_BUCKET } from "./constants.js";

export async function downloadClipAsset(
  db: DbClient,
  path: string,
): Promise<{ data: Blob; contentType: string } | null> {
  const { data, error } = await db.storage.from(CLIP_ASSETS_BUCKET).download(path);
  if (error || !data) return null;

  const ext = path.split(".").pop()?.toLowerCase();
  const contentType =
    ext === "png"
      ? "image/png"
      : ext === "webp"
        ? "image/webp"
        : ext === "gif"
          ? "image/gif"
          : "image/jpeg";

  return { data, contentType };
}
