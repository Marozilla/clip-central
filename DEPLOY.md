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

Delete or repurpose the auto-created service. You want **three separate services** from the **same GitHub repo**.

### Critical: repo root, not app subdirectory

For **every** service, open **Settings → Root Directory** and leave it **empty** (repo root).  
If you set it to `apps/admin` or similar, `libs/` is missing from the deploy and builds will always fail with `Cannot find module '@clip-central/...'`.

### Build & start commands

| Service name | Build command | Start command |
|--------------|---------------|---------------|
| `admin` | `pnpm run railway:build:admin` | `pnpm --filter @clip-central/admin start` |
| `discord-bot` | `pnpm run railway:build:bot` | `pnpm --filter @clip-central/discord-bot start` |
| `videos-worker` | `pnpm run railway:build:worker` | `pnpm --filter @clip-central/videos-worker start` |

Equivalent build commands (same effect):

```bash
bash scripts/railway/build.sh admin
bash scripts/railway/build.sh bot
bash scripts/railway/build.sh worker
```

**Do not use** `pnpm --filter @clip-central/videos-worker build` alone — that skips compiling `libs/` first.

For each service:

1. **+ New** → **GitHub Repo** → `clip-central` (same repo).
2. **Settings** → confirm **Root Directory** is empty.
3. **Settings** → set **Build Command** and **Start Command** from the table above.
4. **Settings** → **Networking**:
   - **admin**: enable **Generate Domain** (public HTTPS URL).
   - **discord-bot** and **videos-worker**: leave public networking **off** (internal only).

Railway uses `nixpacks.toml` at the repo root for `pnpm install`. With `packageManager` in `package.json`, Corepack pins pnpm 9.

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
| `DISCORD_BOT_PRIVATE_HOST` | Reference → `discord-bot` → `RAILWAY_PRIVATE_DOMAIN` |
| `DISCORD_BOT_PRIVATE_PORT` | `8080` (must match `PORT` on discord-bot) |
| `VIDEOS_WORKER_PRIVATE_HOST` | Reference → `videos-worker` → `RAILWAY_PRIVATE_DOMAIN` |
| `VIDEOS_WORKER_PRIVATE_PORT` | `8080` (must match `PORT` on videos-worker) |

### discord-bot only

| Variable | Value |
|----------|-------|
| `DISCORD_TOKEN` | Bot token from Discord Developer Portal |
| `DISCORD_GUILD_ID` | Your Discord server ID |
| `VIDEOS_WORKER_PRIVATE_HOST` | Reference → `videos-worker` → `RAILWAY_PRIVATE_DOMAIN` |
| `VIDEOS_WORKER_PRIVATE_PORT` | `8080` (must match `PORT` on videos-worker) |
| `QUEUE_POLL_INTERVAL_MS` | `3000` |

On **discord-bot**, set `PORT=8080` (plain text). Do **not** set `BOT_HTTP_PORT=3001` — that overrides Railway's port and breaks admin → bot calls (admin uses `DISCORD_BOT_PRIVATE_PORT=8080`).

`BOT_HTTP_PORT` is optional — when unset, the bot uses Railway's injected `PORT`.

### videos-worker only

| Variable | Value |
|----------|-------|
| `SCRAPECREATORS_API_KEY` | Your Scrape Creators API key |
| `DISCORD_BOT_PRIVATE_HOST` | Reference → `discord-bot` → `RAILWAY_PRIVATE_DOMAIN` |
| `DISCORD_BOT_PRIVATE_PORT` | `8080` (must match `PORT` on discord-bot) |
| `REFRESH_INTERVAL_HOURS` | `2` (or `6`) |
| `REQUEST_DELAY_MS` | `200` |
| `PORT` | `8080` |

#### Redis on videos-worker

Railway's Redis plugin stores `REDIS_URL` as a **nested template** (`redis://${{REDISUSER}}:...`). Referencing `${{Redis.REDIS_URL}}` from another service often fails → worker falls back to `localhost:6379`.

**Recommended:** delete `REDIS_URL` on videos-worker and set:

| Variable | Value |
|----------|-------|
| `REDIS_PRIVATE_HOST` | Reference → **Redis** → `RAILWAY_PRIVATE_DOMAIN` |
| `REDIS_PASSWORD` | Reference → **Redis** → `REDIS_PASSWORD` |
| `REDISPORT` | `6379` (plain text) |
| `REDISUSER` | `default` (plain text) |

**Alternative:** on the Redis service, open Variables, copy the **fully resolved** private `REDIS_URL` string and paste it as plain `REDIS_URL` on videos-worker (no `${{...}}`).

For **local dev** against Railway Redis, use `REDIS_PUBLIC_URL` from Redis → Connect → Public URL.

### Internal service URLs (private network)

**Rename your Railway services** on the project canvas to exactly: `admin`, `discord-bot`, `videos-worker`.

#### If you see `http://:` in crash logs

That means a composite URL like `http://${{discord-bot.RAILWAY_PRIVATE_DOMAIN}}:${{discord-bot.PORT}}` was typed as **plain text**. Railway strips the references and leaves `http://:`.

**Fix (do this on every service + Shared Variables):**

1. **Delete** `BOT_INTERNAL_URL` and `WORKER_URL` entirely (including from **Shared Variables** if set there).
2. Add the host/port variables below using **Variables → New Variable → Reference** (pick service, then variable — do **not** type `${{` yourself).

#### On `admin` and `videos-worker` (reach the Discord bot)

| Variable | Value |
|----------|-------|
| `DISCORD_BOT_PRIVATE_HOST` | Reference → service **discord-bot** → `RAILWAY_PRIVATE_DOMAIN` |
| `DISCORD_BOT_PRIVATE_PORT` | Reference → service **discord-bot** → `PORT` **or** plain `8080` (see below) |

Do **not** set `BOT_INTERNAL_URL` on Railway.

#### On `admin` and `discord-bot` (reach the videos worker)

| Variable | Value |
|----------|-------|
| `VIDEOS_WORKER_PRIVATE_HOST` | Reference → service **videos-worker** → `RAILWAY_PRIVATE_DOMAIN` |
| `VIDEOS_WORKER_PRIVATE_PORT` | Reference → service **videos-worker** → `PORT` **or** plain `8080` (see below) |

Do **not** set `WORKER_URL` on Railway.

#### Railway `PORT` is not auto-referenceable

Railway injects `PORT` at **runtime**, but it does **not** appear in the variable reference picker. That is why `${{discord-bot.PORT}}` resolves empty and you get `http://:`.

**Fix:** on each **target** service, add an explicit service variable (plain text, not a reference):

| Service | Add this variable |
|---------|-------------------|
| **discord-bot** | `PORT` = `8080` |
| **videos-worker** | `PORT` = `8080` |

Both apps already listen on `process.env.PORT`, so they will bind to 8080. Other services can then reference `${{discord-bot.PORT}}` / `${{videos-worker.PORT}}`, **or** you can skip the reference and set `DISCORD_BOT_PRIVATE_PORT=8080` / `VIDEOS_WORKER_PRIVATE_PORT=8080` as plain text on the calling services.

After saving, redeploy **discord-bot** and **videos-worker** first, then redeploy services that call them.

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
| Worker crash: `Invalid url` / `http://:` | Delete `BOT_INTERNAL_URL` / `WORKER_URL`. Set host as a Reference; set port to plain `8080` after adding `PORT=8080` on target services. |
| Bot build still runs `pnpm --filter ... build` | Change **Build Command** to `pnpm run railway:build:bot` and redeploy after pushing latest code. |
| Admin "Could not reach Discord bot" | Check `DISCORD_BOT_PRIVATE_HOST` / `PORT` references. Bot service must be running. |
| Worker Redis errors / `127.0.0.1:6379` | Do not use `${{Redis.REDIS_URL}}` — it is a nested template. Use `REDIS_PRIVATE_HOST` + `REDIS_PASSWORD` references, or paste the resolved Redis URL. |
| NextAuth sign-in fails | `NEXTAUTH_URL` must exactly match the public admin URL. Discord redirect URI must match too. |
| Bot exits on startup | `BOT_INTERNAL_KEY` / `WORKER_API_KEY` must be **16+ characters**. |
| Build fails: `Cannot find module '@clip-central/...'` | (1) **Root Directory** must be repo root, not `apps/*`. (2) Build command must be `pnpm run railway:build:worker` (etc.), **not** `pnpm --filter ... build` alone. (3) Push latest code with `scripts/railway/build.sh`. |
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
