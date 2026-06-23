export const CLIP_ASSETS_BUCKET = "clip-assets";

export function clipThumbnailStoragePath(clipId: string): string {
  return `clips/${clipId}/thumbnail.jpg`;
}
