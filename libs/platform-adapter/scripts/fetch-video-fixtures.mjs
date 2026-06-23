/**
 * Fetches live ScrapeCreators video responses and writes them to fixtures/scrape-creators/.
 * Usage: SCRAPECREATORS_API_KEY=... node libs/platform-adapter/scripts/fetch-video-fixtures.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "fixtures", "scrape-creators");
const apiKey = process.env.SCRAPECREATORS_API_KEY;
if (!apiKey) {
  console.error("Set SCRAPECREATORS_API_KEY");
  process.exit(1);
}

const base = "https://api.scrapecreators.com";
mkdirSync(outDir, { recursive: true });

async function fetchJson(path, params) {
  const url = new URL(path, base);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { "x-api-key": apiKey } });
  const data = await res.json();
  return { status: res.status, data };
}

async function resolveTikTokUrl() {
  const { data } = await fetchJson("/v1/tiktok/get-trending-feed", {});
  const item = data.aweme_list?.[0];
  if (!item?.aweme_id || !item?.author?.unique_id) {
    throw new Error("Could not resolve TikTok sample URL from trending feed");
  }
  return `https://www.tiktok.com/@${item.author.unique_id}/video/${item.aweme_id}`;
}

async function resolveInstagramUrl() {
  const { data } = await fetchJson("/v1/instagram/profile", { handle: "instagram", trim: true });
  const shortcode =
    data?.data?.user?.edge_felix_video_timeline?.edges?.[0]?.node?.shortcode ??
    data?.data?.user?.edge_owner_to_timeline_media?.edges?.[0]?.node?.shortcode;
  if (!shortcode) throw new Error("Could not resolve Instagram sample URL from profile");
  return `https://www.instagram.com/reel/${shortcode}/`;
}

const samples = [
  {
    file: "tiktok-video.json",
    path: "/v2/tiktok/video",
    params: async () => ({ url: await resolveTikTokUrl(), trim: true }),
  },
  {
    file: "youtube-video.json",
    path: "/v1/youtube/video",
    params: async () => ({ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }),
  },
  {
    file: "instagram-post.json",
    path: "/v1/instagram/post",
    params: async () => ({ url: await resolveInstagramUrl(), trim: true }),
  },
  {
    file: "twitter-tweet.json",
    path: "/v1/twitter/tweet",
    params: async () => ({
      url: "https://twitter.com/elonmusk/status/2069108349656834236",
      trim: true,
    }),
  },
];

for (const sample of samples) {
  const params = await sample.params();
  const { status, data } = await fetchJson(sample.path, params);
  const outPath = join(outDir, sample.file);
  writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`${sample.file} (${status}) → ${outPath}`);
}
