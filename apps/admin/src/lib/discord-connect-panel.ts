import { callBot } from "./clients";

export type ConnectPanelRefreshResult = {
  ok: boolean;
  posted?: boolean;
  error?: string;
};

export async function refreshConnectPanelOnDiscord(): Promise<ConnectPanelRefreshResult> {
  try {
    return (await callBot("/internal/connect-panel/refresh", {})) as ConnectPanelRefreshResult;
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
