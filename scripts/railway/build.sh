#!/usr/bin/env bash
# Railway build entrypoint — always runs from monorepo root so workspace libs compile first.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

SERVICE="${1:?Usage: build.sh admin|bot|worker}"

echo "==> Building workspace libs from ${ROOT}"
pnpm run build:libs

case "$SERVICE" in
  admin)
    echo "==> Building admin"
    pnpm --filter @clip-central/admin exec next build
    ;;
  bot)
    echo "==> Building discord-bot"
    pnpm --filter @clip-central/discord-bot exec tsc
    ;;
  worker)
    echo "==> Building videos-worker"
    pnpm --filter @clip-central/videos-worker exec tsc
    ;;
  *)
    echo "Unknown service: $SERVICE" >&2
    exit 1
    ;;
esac

echo "==> Build complete: $SERVICE"
