import type { DbClient } from "@clip-central/db";
import sharp from "sharp";
import { CLIP_ASSETS_BUCKET, clipThumbnailStoragePath } from "./constants.js";

const BUCKET_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const EXOTIC_MIME = new Set([
  "image/heic",
  "image/heif",
  "image/avif",
  "image/bmp",
  "image/tiff",
]);

const FETCH_ACCEPT =
  "image/jpeg,image/png,image/webp,image/apng,image/*,*/*;q=0.8";

function thumbnailFetchHeaders(url: string): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    Accept: FETCH_ACCEPT,
  };

  if (url.includes("cdninstagram.com") || url.includes("fbcdn.net")) {
    headers.Referer = "https://www.instagram.com/";
    headers.Origin = "https://www.instagram.com";
  } else if (url.includes("tiktokcdn") || url.includes("tiktok.com")) {
    headers.Referer = "https://www.tiktok.com/";
  } else if (url.includes("ytimg.com") || url.includes("youtube.com")) {
    headers.Referer = "https://www.youtube.com/";
  }

  return headers;
}

async function normalizeThumbnail(
  input: Buffer,
  contentType: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const mime = contentType.split(";")[0]?.trim().toLowerCase() ?? "image/jpeg";

  if (BUCKET_MIME_TYPES.has(mime) && !EXOTIC_MIME.has(mime)) {
    return { buffer: input, contentType: mime };
  }

  try {
    const jpeg = await sharp(input).rotate().jpeg({ quality: 85 }).toBuffer();
    return { buffer: jpeg, contentType: "image/jpeg" };
  } catch {
    return null;
  }
}

async function tryMirrorFromUrl(
  db: DbClient,
  clipId: string,
  sourceUrl: string,
): Promise<string | null> {
  const res = await fetch(sourceUrl, {
    headers: thumbnailFetchHeaders(sourceUrl),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;

  const rawContentType = res.headers.get("content-type") ?? "image/jpeg";
  if (!rawContentType.startsWith("image/")) return null;

  const raw = Buffer.from(await res.arrayBuffer());
  const normalized = await normalizeThumbnail(raw, rawContentType);
  if (!normalized || !BUCKET_MIME_TYPES.has(normalized.contentType)) return null;

  const path = clipThumbnailStoragePath(clipId);
  const { error } = await db.storage.from(CLIP_ASSETS_BUCKET).upload(path, normalized.buffer, {
    contentType: normalized.contentType,
    upsert: true,
  });

  if (error) throw new Error(`Thumbnail upload failed: ${error.message}`);
  return path;
}

/** Download a remote thumbnail and store it in the private Supabase bucket. */
export async function mirrorClipThumbnail(
  db: DbClient,
  clipId: string,
  sourceUrl: string,
  alternateUrls: string[] = [],
): Promise<string | null> {
  if (!sourceUrl.startsWith("http")) return null;

  const candidates = [...new Set([sourceUrl, ...alternateUrls].filter((u) => u.startsWith("http")))];

  for (const url of candidates) {
    try {
      const path = await tryMirrorFromUrl(db, clipId, url);
      if (path) return path;
    } catch (err) {
      console.warn(`Thumbnail candidate failed for clip ${clipId} (${url}):`, err);
    }
  }

  return null;
}
