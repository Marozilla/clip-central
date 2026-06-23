import { parseVideoUrl } from "../scrape-creators.js";

describe("parseVideoUrl", () => {
  it("parses TikTok URLs", () => {
    expect(
      parseVideoUrl("https://www.tiktok.com/@user/video/7251387037834595630"),
    ).toEqual({ platform: "tiktok", videoId: "7251387037834595630" });
  });

  it("parses YouTube URLs", () => {
    expect(parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
      platform: "youtube",
      videoId: "dQw4w9WgXcQ",
    });
    expect(parseVideoUrl("https://youtu.be/dQw4w9WgXcQ")).toEqual({
      platform: "youtube",
      videoId: "dQw4w9WgXcQ",
    });
  });

  it("parses Instagram reel URLs", () => {
    expect(parseVideoUrl("https://www.instagram.com/reel/ABC123xyz/")).toEqual({
      platform: "instagram",
      videoId: "ABC123xyz",
    });
  });

  it("parses Twitter/X URLs", () => {
    expect(parseVideoUrl("https://x.com/elonmusk/status/1234567890")).toEqual({
      platform: "twitter",
      videoId: "1234567890",
    });
  });

  it("returns null for unknown URLs", () => {
    expect(parseVideoUrl("https://example.com")).toBeNull();
  });
});
