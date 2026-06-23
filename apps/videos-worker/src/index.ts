import { createSupabaseClient } from "@clip-central/db";
import { loadWorkerEnv } from "./config.js";
import { createHttpServer } from "./http.js";
import { startRefreshScheduler } from "./queue.js";
import { createWorkerServices } from "./services.js";

async function main() {
  const env = loadWorkerEnv();
  const db = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const svc = createWorkerServices(env, db);

  const app = createHttpServer(svc, env.WORKER_API_KEY);
  app.listen(env.PORT, () => {
    console.log(`Videos worker HTTP listening on :${env.PORT}`);
  });

  startRefreshScheduler(env, svc);
  console.log(`Scheduled refresh every ${env.REFRESH_INTERVAL_HOURS}h`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
