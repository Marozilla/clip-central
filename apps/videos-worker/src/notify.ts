import type { WorkerEnv } from "./config.js";

export async function notifyCreator(
  env: WorkerEnv,
  discordId: string,
  message: string,
): Promise<void> {
  try {
    const res = await fetch(`${env.BOT_INTERNAL_URL}/internal/dm/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.BOT_INTERNAL_KEY}`,
      },
      body: JSON.stringify({ discordId, message }),
    });
    if (!res.ok) {
      console.error("Failed to notify creator:", await res.text());
    }
  } catch (err) {
    console.error("Failed to reach bot for DM:", err);
  }
}
