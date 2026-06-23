import { callBot } from "./clients";

export type LeaderboardRefreshResult = {
  ok: boolean;
  posted?: boolean;
  error?: string;
};

export async function refreshLeaderboardOnDiscord(): Promise<LeaderboardRefreshResult> {
  try {
    return (await callBot("/internal/leaderboard/refresh", {})) as LeaderboardRefreshResult;
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
