# Deploy Clip Central on Railway

This guide covers pushing the monorepo to GitHub and running all services on [Railway](https://railway.com).

## Architecture on Railway

| Service | Purpose | Public URL? |
|---------|---------|-------------|
| **admin** | Next.js staff dashboard | Yes — your main site |
| **discord-bot** | Discord gateway + internal HTTP API | No — private network only |
| **videos-worker** | BullMQ view refresh + verify API | No — private network only |
| **Redis** | BullMQ job queue | No — Railway plugin |

```
                    ┌─────────────┐
  Staff browser ──► │    admin    │
                    └──────┬──────┘
                           │ private network
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ discord- │ │  videos- │ │  Redis   │
        │   bot    │ │  worker  │ │          │
        └────┬─────┘ └────┬─────┘ └────▲─────┘
             │            └────────────┘
             ▼
        Discord API
             │
             ▼
        Supabase (hosted — not on Railway)
```

---

## Step 0 — Security before you push

1. **Never commit `.env`** — it is gitignored. Only `.env.example` goes to GitHub.
2. **Rotate any secrets** that were ever pasted into chat, screenshots, or shared docs (Discord bot token, Supabase service role key, OAuth secret, API keys). Generate new values in each provider's dashboard.
3. Use long random strings (16+ chars) for `BOT_INTERNAL_KEY` and `WORKER_API_KEY`.

---

## Step 1 — Push to GitHub

From the repo root:

```powershell
cd E:\clip-central

# First commit (if not done yet)
git add .
git commit -m "Initial commit: Clip Central monorepo"

# Create an empty repo on GitHub (github.com → New repository → clip-central)
# Do NOT add a README/license on GitHub if you already have one locally.

git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/clip-central.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub handle.

---

## Step 2 — Create a Railway project

1. Go to [railway.com](https://railway.com) → **New Project**.
2. Choose **Deploy from GitHub repo** → select `clip-central`.
3. Railway will create a first service from the repo — we'll reconfigure it.

---

## Step 3 — Add Redis

1. In the project canvas, click **+ New** → **Database** → **Add Redis**.
2. After it provisions, open the Redis service → **Variables** tab.
3. Note `REDIS_URL` — this is the **private** URL (used by services running on Railway).
4. For **local dev** against this Redis, copy **Connect → Public URL** into your local `.env` as `REDIS_PUBLIC_URL`.

---

## Step 4 — Create the three app services

Delete or repurpose the auto-created service. You want **three separate services** from the **same GitHub repo**:

| Service name | Build command | Start command |
|--------------|---------------|---------------|
| `admin` | `pnpm run build:admin` | `pnpm --filter @clip-central/admin start` |
| `discord-bot` | `pnpm run build:bot` | `pnpm --filter @clip-central/discord-bot start` |
| `videos-worker` | `pnpm run build:worker` | `pnpm --filter @clip-central/videos-worker start` |

For each service:

1. **+ New** → **GitHub Repo** → `clip-central` (same repo).
2. **Settings** → set the **Build Command** and **Start Command** from the table above.
3. **Settings** → **Networking**:
   - **admin**: enable **Generate Domain** (public HTTPS URL).
   - **discord-bot** and **videos-worker**: leave public networking **off** (internal only).

Railway/Nixpacks will detect Node from `package.json`. With `packageManager` set, Corepack installs pnpm automatically.

Optional: under **Settings → Watch Paths**, limit redeploys:

- `admin` → `apps/admin/**`, `libs/**`
- `discord-bot` → `apps/discord-bot/**`, `libs/**`
- `videos-worker` → `apps/videos-worker/**`, `libs/**`

---

## Step 5 — Environment variables

Set these in each Railway service (**Variables** tab). Use **Shared Variables** at the project level for values that repeat (Supabase, Discord OAuth, internal keys).

### Shared (all three app services)

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase → Settings → API |
| `DISCORD_CLIENT_ID` | Discord application ID |
| `DISCORD_CLIENT_SECRET` | Discord OAuth secret |
| `BOT_INTERNAL_KEY` | Same long random string everywhere (16+ chars) |
| `WORKER_API_KEY` | Same long random string everywhere (16+ chars) |

### admin only

| Variable | Value |
|----------|-------|
| `NEXTAUTH_URL` | `https://YOUR-ADMIN-DOMAIN.up.railway.app` (no trailing slash) |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `ADMIN_DISCORD_IDS` | Your Discord user ID (comma-separated for multiple) |
| `DISCORD_GUILD_ID` | Your Discord server ID |
| `DISCORD_CAMPAIGN_CHANNEL_ID` | Default campaign channel (optional) |
| `BOT_INTERNAL_URL` | See below |
| `WORKER_URL` | See below |

### discord-bot only

| Variable | Value |
|----------|-------|
| `DISCORD_TOKEN` | Bot token from Discord Developer Portal |
| `DISCORD_GUILD_ID` | Your Discord server ID |
| `WORKER_URL` | See below |
| `QUEUE_POLL_INTERVAL_MS` | `3000` |

`BOT_HTTP_PORT` is optional — the bot falls back to Railway's injected `PORT`.

### videos-worker only

| Variable | Value |
|----------|-------|
| `REDIS_URL` | `${{Redis.REDIS_URL}}` (Railway reference to your Redis service) |
| `SCRAPECREATORS_API_KEY` | Your Scrape Creators API key |
| `BOT_INTERNAL_URL` | See below |
| `REFRESH_INTERVAL_HOURS` | `2` (or `6`) |
| `REQUEST_DELAY_MS` | `200` |

`PORT` is set automatically by Railway for the worker HTTP server.

### Internal service URLs (private network)

After all services are deployed, wire them using Railway **service references** (replace service names if yours differ):

| Variable | Set on | Example value |
|----------|--------|---------------|
| `BOT_INTERNAL_URL` | admin, videos-worker | `http://${{discord-bot.RAILWAY_PRIVATE_DOMAIN}}:${{discord-bot.PORT}}` |
| `WORKER_URL` | admin, discord-bot | `http://${{videos-worker.RAILWAY_PRIVATE_DOMAIN}}:${{videos-worker.PORT}}` |

In the Railway UI: **Variables → Add Reference** → pick the target service → choose `RAILWAY_PRIVATE_DOMAIN` and `PORT`.

> **Local dev:** keep `BOT_INTERNAL_URL=http://localhost:3001` and `WORKER_URL=http://localhost:3002`. For Redis on Railway from your machine, set `REDIS_PUBLIC_URL` (not `REDIS_URL`) in `.env`.

---

## Step 6 — Discord OAuth redirect

In the [Discord Developer Portal](https://discord.com/developers/applications) → your app → **OAuth2**:

1. Add redirect URL: `https://YOUR-ADMIN-DOMAIN.up.railway.app/api/auth/callback/discord`
2. Keep `http://localhost:3000/api/auth/callback/discord` for local dev.

---

## Step 7 — Supabase

Database is hosted on Supabase (not Railway). Migrations live in `supabase/migrations/`. Apply them via:

- Supabase Dashboard → SQL Editor, or
- `supabase db push` if you use the Supabase CLI linked to project `vesfjjekalfcvpevluxx`

No extra Railway setup needed for Postgres.

---

## Step 8 — Deploy and verify

1. Trigger deploy on all three services (push to `main` or **Redeploy** in Railway).
2. Check logs:
   - **discord-bot**: `Logged in as ...`, `Submission queue poller started`
   - **videos-worker**: listening on `PORT`, BullMQ worker started
   - **admin**: Next.js ready
3. Open the admin public URL → sign in with Discord.
4. In Discord, run `/setup-connect` in your server.
5. Create a test campaign in admin → confirm the embed posts.

### Health checks (optional)

- Bot: `GET /health` on the bot's private URL (from another Railway service or `railway run`).
- Worker: check logs for successful Redis connection.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Admin "Could not reach Discord bot" | Check `BOT_INTERNAL_URL` uses private domain + correct `PORT`. Bot service must be running. |
| Worker Redis errors | On Railway, `REDIS_URL` must be the Redis plugin reference, not `localhost`. |
| NextAuth sign-in fails | `NEXTAUTH_URL` must exactly match the public admin URL. Discord redirect URI must match too. |
| Bot exits on startup | `BOT_INTERNAL_KEY` / `WORKER_API_KEY` must be **16+ characters**. |
| Build fails on libs | Ensure build command is `pnpm run build:admin` (etc.), not `next build` alone. |
| pnpm not found | Confirm root `package.json` has `"packageManager": "pnpm@9.x"`. |

---

## Local dev vs Railway

| | Local | Railway |
|---|-------|---------|
| Redis | `docker compose up -d` | Redis plugin |
| Env file | Root `.env` via `dotenv-cli` in dev scripts | Railway Variables |
| Admin URL | `http://localhost:3000` | Generated Railway domain |
| Service URLs | `localhost:3001` / `:3002` | `*.railway.internal` references |

See root `README.md` for local setup.
