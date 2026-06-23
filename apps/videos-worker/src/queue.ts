import { Queue, Worker } from "bullmq";
import type { WorkerEnv } from "./config.js";
import type { WorkerServices } from "./services.js";
import { refreshActiveClips } from "./services.js";

const QUEUE_NAME = "clip-refresh";

export function startRefreshScheduler(env: WorkerEnv, svc: WorkerServices) {
  const connection = {
    url: env.REDIS_URL,
    maxRetriesPerRequest: null as null,
  };

  const queue = new Queue(QUEUE_NAME, { connection });

  const intervalMs = env.REFRESH_INTERVAL_HOURS * 60 * 60 * 1000;

  queue.add(
    "scheduled-refresh",
    {},
    {
      repeat: { every: intervalMs },
      jobId: "scheduled-refresh",
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  );

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      console.log(`Running refresh job: ${job.name}`);
      const result = await refreshActiveClips(svc);
      console.log("Refresh complete:", result);
      return result;
    },
    { connection },
  );

  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
  });

  const heartbeatInterval = setInterval(async () => {
    await svc.db
      .from("worker_heartbeat")
      .upsert({ id: "main", last_seen_at: new Date().toISOString() });
  }, 15_000);

  worker.on("closed", () => clearInterval(heartbeatInterval));

  return { queue, worker };
}

export async function enqueueCampaignRefresh(
  queue: Queue,
  campaignId: string,
): Promise<void> {
  await queue.add("campaign-refresh", { campaignId }, { removeOnComplete: true });
}
