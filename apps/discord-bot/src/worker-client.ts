import type { BotEnv } from "./config.js";

export async function callWorker<T>(
  env: BotEnv,
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${env.WORKER_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.WORKER_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Worker ${path} failed: ${text}`);
  }

  return res.json() as Promise<T>;
}
