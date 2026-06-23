# Clip Central

Discord clipping campaign platform — barebones rebuild. Creators join campaigns in Discord, submit clip URLs, staff approve clips in a web admin dashboard, and a background worker tracks view counts via [Scrape Creators](https://docs.scrapecreators.com/introduction).

## Architecture

```
apps/
  admin/           Next.js staff dashboard (port 3000)
  discord-bot/     Discord.js bot + internal HTTP API (port 3001)
  videos-worker/   BullMQ view refresh + verify endpoints (port 3002)
libs/
  db/              Supabase client + generated types
  platform-adapter/ Scrape Creators social data adapter
  shared/          Shared utilities
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- Redis (for BullMQ) — `docker compose up -d`
- Supabase project (schema already applied to **Clip Central**)
- Discord application with bot + OAuth2
- [Scrape Creators](https://app.scrapecreators.com) API key

## Setup

1. **Clone and install**

   ```bash
   pnpm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env
   # Fill in all values — see .env.example for descriptions
   ```

   Get your Supabase service role key from the [Supabase dashboard](https://supabase.com/dashboard/project/vesfjjekalfcvpevluxx/settings/api).

3. **Start Redis**

   ```bash
   docker compose up -d
   ```

4. **Build shared libraries**

   ```bash
   pnpm --filter @clip-central/db build
   pnpm --filter @clip-central/shared build
   pnpm --filter @clip-central/platform-adapter build
   ```

5. **Run all services** (three terminals, or use `pnpm dev`)

   ```bash
   pnpm dev:admin    # http://localhost:3000
   pnpm dev:bot      # Discord bot + :3001 internal API
   pnpm dev:worker   # :3002 worker API + scheduled refresh
   ```

## Discord Bot Setup

1. Create a Discord application at https://discord.com/developers/applications
2. Enable **Bot** intent: `Guilds`, `Guild Messages`, `Direct Messages`
3. Invite bot with permissions: Send Messages, Embed Links, Use Slash Commands
4. In your server, run `/setup-connect` once to post the account linking panel
5. Create campaigns in the **admin dashboard** — embeds post to Discord automatically

## Admin Dashboard

1. Add your Discord user ID to `ADMIN_DISCORD_IDS` in `.env`
2. Set Discord OAuth redirect: `http://localhost:3000/api/auth/callback/discord`
3. Sign in at http://localhost:3000

### Admin workflows

- **Create campaign** → pick a Discord channel → embed posts automatically when status is Active
- **Post to Discord** button on campaign detail if the initial post failed
- **Approve/reject clips** on campaign detail page
- **Refresh views** manually or wait for scheduled worker run (default: every 6h)
- **View creators** and linked social accounts

## API Endpoints (internal)

| Service | Endpoint | Purpose |
|---------|----------|---------|
| Worker | `POST /verify-profile` | Bio verification during account linking |
| Worker | `POST /verify-video` | Clip ownership verification |
| Worker | `POST /update-campaign` | Manual view refresh for all campaign clips |
| Worker | `POST /update-clip` | Refresh single clip |
| Bot | `POST /internal/dm/send` | Send DM to creator |
| Bot | `POST /internal/campaign/post` | Post campaign embed |

All internal endpoints require `Authorization: Bearer <key>` or `x-api-key` header.

## Swapping Social Data Providers

All platform API calls go through `libs/platform-adapter/src/scrape-creators.ts`. To swap providers, edit that single file — bot and admin code stay unchanged.

## Database

Supabase project: **Clip Central** (`vesfjjekalfcvpevluxx`)

Tables: `users`, `social_accounts`, `campaigns`, `campaign_participants`, `clips`, `submission_queue`, `clip_view_history`, `worker_heartbeat`

Local migration reference: `supabase/migrations/`

## Tests

```bash
pnpm --filter @clip-central/platform-adapter test
```

## Deploy to production

See **[DEPLOY.md](./DEPLOY.md)** for pushing to GitHub and deploying all services on Railway.
