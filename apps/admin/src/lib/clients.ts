import { getEnv } from "./env";

export async function callBotGet<T = unknown>(path: string): Promise<T> {
  const env = getEnv();
  const res = await fetch(`${env.BOT_INTERNAL_URL}${path}`, {
    headers: { Authorization: `Bearer ${env.BOT_INTERNAL_KEY}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export async function callBot(path: string, body: Record<string, unknown>) {
  const env = getEnv();
  const res = await fetch(`${env.BOT_INTERNAL_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.BOT_INTERNAL_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function callWorker(path: string, body: Record<string, unknown>) {
  const env = getEnv();
  const res = await fetch(`${env.WORKER_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.WORKER_API_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
