import type { ClipVideoMetadata } from "@clip-central/shared";
import type { Platform } from "@clip-central/shared";

export interface ParsedVideoUrl {
  platform: Platform;
  videoId: string;
}

export interface VideoStats {
  views: number;
  ownerHandle: string;
  title?: string;
  thumbnailUrl?: string;
  /** Fallback URLs to try if the primary thumbnail is HEIC or fails to download */
  thumbnailAlternates?: string[];
  isDeleted?: boolean;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  durationSeconds?: number;
  publishedAt?: string;
  authorDisplayName?: string;
}

export interface ProfileInfo {
  bio: string;
  followerCount?: number;
}

export interface SocialPlatformAdapter {
  parseVideoUrl(url: string): ParsedVideoUrl | null;
  getVideo(videoId: string, url?: string): Promise<VideoStats>;
  getProfile(handle: string): Promise<ProfileInfo>;
}

export interface ScrapeCreatorsConfig {
  apiKey: string;
  baseUrl?: string;
  requestDelayMs?: number;
}

const BASE_URL = "https://api.scrapecreators.com";

export class ScrapeCreatorsClient {
  private lastRequestAt = 0;

  constructor(private config: ScrapeCreatorsConfig) {}

  private async throttle(): Promise<void> {
    const delay = this.config.requestDelayMs ?? 200;
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < delay) {
      await new Promise((r) => setTimeout(r, delay - elapsed));
    }
    this.lastRequestAt = Date.now();
  }

  async fetch<T>(path: string, params?: Record<string, string | boolean>): Promise<T> {
    await this.throttle();
    const url = new URL(path, this.config.baseUrl ?? BASE_URL);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
      }
    }

    const res = await fetch(url.toString(), {
      headers: { "x-api-key": this.config.apiKey },
    });

    if (res.status === 404) {
      throw new NotFoundError(`Resource not found: ${path}`);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new ScrapeCreatorsError(res.status, body || res.statusText);
    }

    return res.json() as Promise<T>;
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ScrapeCreatorsError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ScrapeCreatorsError";
  }
}

export function parseVideoUrl(url: string): ParsedVideoUrl | null {
  const trimmed = url.trim();

  const tiktokMatch = trimmed.match(
    /tiktok\.com\/@[^/]+\/video\/(\d+)|tiktok\.com\/t\/(\w+)|vm\.tiktok\.com\/(\w+)/i,
  );
  if (tiktokMatch) {
    const id = tiktokMatch[1] ?? tiktokMatch[2] ?? tiktokMatch[3];
    if (id) return { platform: "tiktok", videoId: id };
  }

  const ytMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
  );
  if (ytMatch?.[1]) return { platform: "youtube", videoId: ytMatch[1] };

  const igMatch = trimmed.match(
    /instagram\.com\/(?:p|reel|reels)\/([a-zA-Z0-9_-]+)/i,
  );
  if (igMatch?.[1]) return { platform: "instagram", videoId: igMatch[1] };

  const twMatch = trimmed.match(
    /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/i,
  );
  if (twMatch?.[1]) return { platform: "twitter", videoId: twMatch[1] };

  return null;
}

function normalizeHandle(handle: string): string {
  return handle.replace(/^@/, "").trim().toLowerCase();
}

function handlesMatch(a: string, b: string): boolean {
  return normalizeHandle(a) === normalizeHandle(b);
}

function unixToIso(ts?: number): string | undefined {
  if (!ts) return undefined;
  return new Date(ts * 1000).toISOString();
}

function parseCount(value?: number | string): number | undefined {
  if (value == null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function scoreThumbnailUrl(url: string): number {
  const lower = url.toLowerCase();
  if (lower.includes(".heic") || lower.includes(".heif")) return 0;
  if (/\.jpe?g(\?|$|\/)/i.test(lower)) return 10;
  if (lower.includes("dst-jpg") || lower.includes("format=jpg") || lower.includes("stp=dst-jpg")) {
    return 9;
  }
  if (lower.includes(".webp")) return 5;
  if (lower.includes(".png")) return 4;
  return 2;
}

export function rankThumbnailUrls(urls: (string | undefined | null)[]): string[] {
  const unique = [...new Set(urls.filter((u): u is string => typeof u === "string" && u.startsWith("http")))];
  return unique.sort((a, b) => scoreThumbnailUrl(b) - scoreThumbnailUrl(a));
}

function pickThumbnails(...groups: (string | undefined | null)[][]): {
  thumbnailUrl?: string;
  thumbnailAlternates?: string[];
} {
  const ranked = rankThumbnailUrls(groups.flat());
  return {
    thumbnailUrl: ranked[0],
    thumbnailAlternates: ranked.slice(1),
  };
}

type InstagramPostMedia = {
  caption?: string;
  play_count?: number;
  video_view_count?: number;
  like_count?: number;
  comment_count?: number;
  taken_at_timestamp?: number;
  display_url?: string;
  thumbnail_url?: string;
  thumbnail_src?: string;
  thumbnail_resources?: Array<{ src?: string; config_width?: number }>;
  image_versions2?: { candidates?: Array<{ url?: string; width?: number }> };
  video_duration?: number;
  owner?: { username?: string; full_name?: string };
  edge_media_to_caption?: { edges?: Array<{ node?: { text?: string } }> };
  edge_media_preview_like?: { count?: number };
  edge_media_to_parent_comment?: { count?: number };
};

function pickInstagramThumbnail(data: {
  display_url?: string;
  thumbnail_url?: string;
  thumbnail_src?: string;
  thumbnail_resources?: Array<{ src?: string; config_width?: number }>;
  image_versions2?: { candidates?: Array<{ url?: string; width?: number }> };
}): { thumbnailUrl?: string; thumbnailAlternates?: string[] } {
  const fromResources = [...(data.thumbnail_resources ?? [])]
    .sort((a, b) => (b.config_width ?? 0) - (a.config_width ?? 0))
    .map((r) => r.src);
  const fromCandidates = [...(data.image_versions2?.candidates ?? [])]
    .sort((a, b) => (b.width ?? 0) - (a.width ?? 0))
    .map((c) => c.url);

  return pickThumbnails(fromCandidates, fromResources, [data.thumbnail_src, data.thumbnail_url, data.display_url]);
}

function pickTwitterThumbnail(data: {
  legacy?: {
    extended_entities?: { media?: Array<{ media_url_https?: string; type?: string }> };
    entities?: { media?: Array<{ media_url_https?: string; type?: string }> };
  };
  extended_entities?: { media?: Array<{ media_url_https?: string; type?: string }> };
  entities?: { media?: Array<{ media_url_https?: string; type?: string }> };
}): string | undefined {
  const media =
    data.legacy?.extended_entities?.media ??
    data.legacy?.entities?.media ??
    data.extended_entities?.media ??
    data.entities?.media;
  const photo = media?.find((m) => m.media_url_https && (m.type === "photo" || m.type === "video"));
  return photo?.media_url_https ?? media?.[0]?.media_url_https;
}

type TwitterTweetPayload = {
  user?: { screen_name?: string; name?: string };
  author?: { screen_name?: string; name?: string };
  core?: {
    user_results?: {
      result?: {
        core?: { screen_name?: string; name?: string };
        legacy?: { screen_name?: string; name?: string };
      };
    };
  };
};

/** Resolve tweet author handle from ScrapeCreators tweet payloads (legacy + GraphQL shapes). */
export function extractTwitterOwner(data: TwitterTweetPayload, url?: string): string {
  const fromApi =
    data.user?.screen_name ??
    data.author?.screen_name ??
    data.core?.user_results?.result?.core?.screen_name ??
    data.core?.user_results?.result?.legacy?.screen_name ??
    "";

  if (fromApi) return fromApi.replace(/^@/, "");

  if (url) {
    const match = url.match(/(?:twitter\.com|x\.com)\/([^/?#]+)\/status\//i);
    const handle = match?.[1];
    if (handle && !["i", "intent", "share", "home"].includes(handle.toLowerCase())) {
      return handle.replace(/^@/, "");
    }
  }

  return "";
}

function extractTwitterAuthorName(data: TwitterTweetPayload): string | undefined {
  return (
    data.user?.name ??
    data.author?.name ??
    data.core?.user_results?.result?.core?.name ??
    data.core?.user_results?.result?.legacy?.name
  );
}

export function videoStatsToMetadata(stats: VideoStats): ClipVideoMetadata {
  return {
    fetchedAt: new Date().toISOString(),
    title: stats.title,
    likeCount: stats.likeCount,
    commentCount: stats.commentCount,
    shareCount: stats.shareCount,
    durationSeconds: stats.durationSeconds,
    publishedAt: stats.publishedAt,
    authorDisplayName: stats.authorDisplayName,
    thumbnailSource: stats.thumbnailUrl,
  };
}

export function createPlatformAdapters(
  client: ScrapeCreatorsClient,
): Record<Platform, SocialPlatformAdapter> {
  return {
    tiktok: {
      parseVideoUrl,
      async getVideo(videoId: string, url?: string) {
        const videoUrl =
          url ?? `https://www.tiktok.com/@placeholder/video/${videoId}`;
        try {
          const data = await client.fetch<{
            aweme_detail?: {
              desc?: string;
              create_time?: number;
              statistics?: {
                play_count?: number;
                digg_count?: number;
                comment_count?: number;
                share_count?: number;
              };
              author?: { unique_id?: string; nickname?: string };
              video?: {
                cover?: { url_list?: string[] };
                duration?: number;
              };
            };
          }>("/v2/tiktok/video", { url: videoUrl, trim: true });

          const detail = data.aweme_detail;
          if (!detail) throw new NotFoundError("TikTok video not found");

          const { thumbnailUrl, thumbnailAlternates } = pickThumbnails(
            detail.video?.cover?.url_list ?? [],
          );

          return {
            views: detail.statistics?.play_count ?? 0,
            ownerHandle: detail.author?.unique_id ?? "",
            title: detail.desc,
            thumbnailUrl,
            thumbnailAlternates,
            likeCount: detail.statistics?.digg_count,
            commentCount: detail.statistics?.comment_count,
            shareCount: detail.statistics?.share_count,
            durationSeconds: detail.video?.duration
              ? Math.round(detail.video.duration / 1000)
              : undefined,
            publishedAt: unixToIso(detail.create_time),
            authorDisplayName: detail.author?.nickname,
          };
        } catch (e) {
          if (e instanceof NotFoundError) return { views: 0, ownerHandle: "", isDeleted: true };
          throw e;
        }
      },
      async getProfile(handle: string) {
        const data = await client.fetch<{
          user?: { signature?: string; bio?: string };
          stats?: { followerCount?: number };
          statsV2?: { followerCount?: string };
        }>("/v1/tiktok/profile", { handle: normalizeHandle(handle) });
        return {
          bio: data.user?.signature ?? data.user?.bio ?? "",
          followerCount:
            parseCount(data.stats?.followerCount) ?? parseCount(data.statsV2?.followerCount),
        };
      },
    },

    youtube: {
      parseVideoUrl,
      async getVideo(_videoId: string, url?: string) {
        if (!url) throw new Error("YouTube requires full URL");
        try {
          const data = await client.fetch<{
            id?: string;
            views?: number;
            viewCountInt?: number;
            title?: string;
            thumbnail?: string;
            likeCount?: number;
            likeCountInt?: number;
            likes?: number;
            commentCount?: number;
            commentCountInt?: number;
            comments?: number;
            lengthSeconds?: number;
            lengthInSeconds?: number;
            duration?: number;
            publishDate?: string;
            publishDateText?: string;
            publishedAt?: string;
            channel?: { handle?: string; name?: string; title?: string };
          }>("/v1/youtube/video", { url });

          const thumbnailUrl =
            data.thumbnail ??
            (data.id ? `https://i.ytimg.com/vi/${data.id}/hqdefault.jpg` : undefined);

          return {
            views: data.viewCountInt ?? data.views ?? 0,
            ownerHandle: data.channel?.handle?.replace(/^@/, "") ?? data.channel?.name ?? "",
            title: data.title,
            thumbnailUrl,
            likeCount: data.likeCountInt ?? data.likeCount ?? data.likes,
            commentCount: data.commentCountInt ?? data.commentCount ?? data.comments,
            durationSeconds: data.lengthInSeconds ?? data.lengthSeconds ?? data.duration,
            publishedAt: data.publishDate ?? data.publishedAt,
            authorDisplayName: data.channel?.title ?? data.channel?.name,
          };
        } catch (e) {
          if (e instanceof NotFoundError) return { views: 0, ownerHandle: "", isDeleted: true };
          throw e;
        }
      },
      async getProfile(handle: string) {
        const data = await client.fetch<{
          description?: string;
          about?: string;
          subscriberCount?: number;
        }>("/v1/youtube/channel", { handle: normalizeHandle(handle) });
        return {
          bio: data.description ?? data.about ?? "",
          followerCount: parseCount(data.subscriberCount),
        };
      },
    },

    instagram: {
      parseVideoUrl,
      async getVideo(_videoId: string, url?: string) {
        if (!url) throw new Error("Instagram requires full URL");
        try {
          const raw = await client.fetch<{
            xdt_shortcode_media?: InstagramPostMedia;
          } & InstagramPostMedia>("/v1/instagram/post", { url, trim: true });

          const data: InstagramPostMedia = raw.xdt_shortcode_media ?? raw;
          const caption =
            data.caption ??
            data.edge_media_to_caption?.edges?.[0]?.node?.text;

          const { thumbnailUrl, thumbnailAlternates } = pickInstagramThumbnail(data);

          return {
            views: data.play_count ?? data.video_view_count ?? 0,
            ownerHandle: data.owner?.username ?? "",
            title: caption?.slice(0, 200),
            thumbnailUrl,
            thumbnailAlternates,
            likeCount: data.like_count ?? data.edge_media_preview_like?.count,
            commentCount: data.comment_count ?? data.edge_media_to_parent_comment?.count,
            durationSeconds: data.video_duration
              ? Math.round(data.video_duration)
              : undefined,
            publishedAt: unixToIso(data.taken_at_timestamp),
            authorDisplayName: data.owner?.full_name,
          };
        } catch (e) {
          if (e instanceof NotFoundError) return { views: 0, ownerHandle: "", isDeleted: true };
          throw e;
        }
      },
      async getProfile(handle: string) {
        const data = await client.fetch<{
          biography?: string;
          bio?: string;
          data?: {
            user?: {
              biography?: string;
              bio?: string;
              edge_followed_by?: { count?: number };
            };
          };
          user?: {
            biography?: string;
            bio?: string;
            edge_followed_by?: { count?: number };
          };
        }>("/v1/instagram/profile", { handle: normalizeHandle(handle), trim: true });
        const user = data.data?.user ?? data.user;
        const bio =
          (typeof user === "object" ? (user?.biography ?? user?.bio) : undefined) ??
          data.biography ??
          data.bio ??
          "";
        return {
          bio,
          followerCount:
            typeof user === "object" ? parseCount(user?.edge_followed_by?.count) : undefined,
        };
      },
    },

    twitter: {
      parseVideoUrl,
      async getVideo(_videoId: string, url?: string) {
        if (!url) throw new Error("Twitter requires full URL");
        try {
          const data = await client.fetch<{
            views?: { count?: number | string } | number;
            legacy?: {
              full_text?: string;
              favorite_count?: number;
              reply_count?: number;
              retweet_count?: number;
              created_at?: string;
              extended_entities?: { media?: Array<{ media_url_https?: string; type?: string }> };
              entities?: { media?: Array<{ media_url_https?: string; type?: string }> };
            };
            full_text?: string;
            user?: { screen_name?: string; name?: string };
            author?: { screen_name?: string; name?: string };
            core?: TwitterTweetPayload["core"];
            extended_entities?: { media?: Array<{ media_url_https?: string; type?: string }> };
            entities?: { media?: Array<{ media_url_https?: string; type?: string }> };
          }>("/v1/twitter/tweet", { url, trim: true });

          const views =
            typeof data.views === "number"
              ? data.views
              : parseCount(
                  typeof data.views === "object" ? data.views?.count : undefined,
                ) ?? 0;

          return {
            views,
            ownerHandle: extractTwitterOwner(data, url),
            title: data.legacy?.full_text ?? data.full_text,
            thumbnailUrl: pickTwitterThumbnail(data),
            likeCount: data.legacy?.favorite_count,
            commentCount: data.legacy?.reply_count,
            shareCount: data.legacy?.retweet_count,
            publishedAt: data.legacy?.created_at,
            authorDisplayName: extractTwitterAuthorName(data),
          };
        } catch (e) {
          if (e instanceof NotFoundError) return { views: 0, ownerHandle: "", isDeleted: true };
          throw e;
        }
      },
      async getProfile(handle: string) {
        const data = await client.fetch<{
          description?: string;
          legacy?: { description?: string; followers_count?: number };
        }>("/v1/twitter/profile", { handle: normalizeHandle(handle) });
        return {
          bio: data.description ?? data.legacy?.description ?? "",
          followerCount: parseCount(data.legacy?.followers_count),
        };
      },
    },
  };
}

export { handlesMatch, normalizeHandle };

export function getAdapterForPlatform(
  adapters: Record<Platform, SocialPlatformAdapter>,
  platform: Platform,
): SocialPlatformAdapter {
  return adapters[platform];
}
