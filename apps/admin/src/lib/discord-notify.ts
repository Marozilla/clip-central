import type { Clip } from "@clip-central/db";
import type { ClipReviewKind, ClipReviewNotification, ClipVideoMetadata } from "@clip-central/shared";
import { callBot } from "./clients";

export type DmResult = { ok: boolean; error?: string };

export async function sendCreatorDm(discordId: string, message: string): Promise<DmResult> {
  try {
    const result = (await callBot("/internal/dm/send", { discordId, message })) as { ok?: boolean };
    if (!result.ok) {
      return {
        ok: false,
        error: "Could not deliver DM — the user may have DMs disabled or hasn't interacted with the bot.",
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Could not reach the Discord bot — is it running on BOT_INTERNAL_URL?",
    };
  }
}

export function clipReviewNotification(
  clip: Pick<
    Clip,
    "platform" | "url" | "owner_handle" | "current_views" | "title" | "video_metadata" | "reject_reason"
  >,
  campaignTitle: string,
  kind: ClipReviewKind,
  rejectReason?: string | null,
): ClipReviewNotification {
  const metadata = (clip.video_metadata as ClipVideoMetadata | null) ?? undefined;

  return {
    kind,
    campaignTitle,
    platform: clip.platform,
    url: clip.url,
    ownerHandle: clip.owner_handle,
    views: clip.current_views,
    metadata,
    clipTitle: clip.title,
    rejectReason: kind === "rejected" ? (rejectReason ?? clip.reject_reason) : undefined,
  };
}

export async function sendClipReviewDm(
  discordId: string,
  notification: ClipReviewNotification,
): Promise<DmResult> {
  try {
    const result = (await callBot("/internal/dm/send", {
      discordId,
      clipNotification: notification,
    })) as { ok?: boolean };

    if (!result.ok) {
      return {
        ok: false,
        error: "Could not deliver DM — the user may have DMs disabled or hasn't interacted with the bot.",
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Could not reach the Discord bot — is it running on BOT_INTERNAL_URL?",
    };
  }
}
