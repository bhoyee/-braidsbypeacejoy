#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Braids by Peace Joy — pull-based deploy for cPanel (CloudLinux Node.js app).
#
# GitHub Actions builds every push to `main` and publishes the result to the
# `deploy` branch. This script (run by cPanel Cron every 2 minutes) notices a
# new build and:
#   1. downloads it                      4. swaps in the new code
#   2. installs packages (if changed)    5. restarts the Node app
#   3. applies database migrations       6. checks /api/health
# If any step fails, the previous version keeps running and the failure is
# logged; that build is not retried until a newer one is published.
#
# Settings can be overridden in ~/bbpj-deploy/config (see DEPLOYMENT.md).
# ─────────────────────────────────────────────────────────────────────────────
set -Eeuo pipefail

DEPLOY_HOME="${DEPLOY_HOME:-$HOME/bbpj-deploy}"
# shellcheck source=/dev/null
[ -f "$DEPLOY_HOME/config" ] && source "$DEPLOY_HOME/config"

REPO_URL="${REPO_URL:-https://github.com/bhoyee/-braidsbypeacejoy.git}"
BRANCH="${BRANCH:-deploy}"
APP_DIR="${APP_DIR:-$HOME/bbpj-api}"          # "Application root" in Setup Node.js App
NODE_VERSION="${NODE_VERSION:-22}"
VENV="${VENV:-$HOME/nodevenv/$(basename "$APP_DIR")/$NODE_VERSION}"
HEALTH_URL="${HEALTH_URL:-}"                  # e.g. https://api.braidsbypeacejoy.com/api/health

SRC="$DEPLOY_HOME/src"
STATE="$DEPLOY_HOME/state"
mkdir -p "$STATE"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
export PRISMA_HIDE_UPDATE_MESSAGE=1 NPM_CONFIG_UPDATE_NOTIFIER=false NEXT_TELEMETRY_DISABLED=1
# Prisma's engine starts a thread per CPU core; CloudLinux caps threads per account,
# which crashes it ("PANIC: timer has gone away"). Two worker threads are plenty.
export TOKIO_WORKER_THREADS=2

# Keep the log from growing forever (cron appends to it).
LOG_FILE="$DEPLOY_HOME/deploy.log"
if [ -f "$LOG_FILE" ] && [ "$(stat -c%s "$LOG_FILE" 2>/dev/null || echo 0)" -gt 1048576 ]; then
  tail -n 2000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
fi

# Only one deploy at a time (a re-exec below already holds the lock).
if [ -z "${BBPJ_REEXEC:-}" ]; then
  exec 9>"$DEPLOY_HOME/.lock"
  flock -n 9 || exit 0
fi

# Remember this script as it was when it started (see the re-exec after fetching).
SELF_COPY="$STATE/server-deploy.running.sh"
cp "${BASH_SOURCE[0]}" "$SELF_COPY" 2>/dev/null || true

# ── 1. Is there a new build? ────────────────────────────────────────────────
if [ ! -d "$SRC/.git" ]; then
  git clone --quiet --depth 1 --single-branch --branch "$BRANCH" "$REPO_URL" "$SRC"
else
  git -C "$SRC" fetch --quiet --depth 1 origin "$BRANCH"
fi
NEW="$(git -C "$SRC" rev-parse FETCH_HEAD 2>/dev/null || git -C "$SRC" rev-parse HEAD)"
[ "$NEW" = "$(cat "$STATE/deployed" 2>/dev/null || true)" ] && exit 0   # already live
[ "$NEW" = "$(cat "$STATE/failed" 2>/dev/null || true)" ] && exit 0     # failed before; wait for a fix
git -C "$SRC" reset --quiet --hard "$NEW"

# This script ships inside the release. If the new release changed it, re-run the
# new version now (bash keeps executing the old copy otherwise). The lock (fd 9)
# is inherited, so nothing else can start in between.
if [ -z "${BBPJ_REEXEC:-}" ] && ! cmp -s "$SELF_COPY" "$SRC/deploy/server-deploy.sh"; then
  export BBPJ_REEXEC=1
  exec bash "$SRC/deploy/server-deploy.sh"
fi
VERSION="$(cat "$SRC/DEPLOY_VERSION" 2>/dev/null || echo "$NEW")"

STEP="starting"
on_error() {
  log "❌ DEPLOY FAILED during: $STEP — the previous version is still running. Fix and push again."
  echo "$NEW" > "$STATE/failed"
}
trap on_error ERR

log "🚀 Deploying ${VERSION:0:7} (build ${NEW:0:7})"

# Copy a directory, replacing the destination (rsync if available).
sync_dir() {
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete "$1/" "$2/"
  else
    rm -rf "$2" && cp -a "$1" "$2"
  fi
}

# ── 2. Node environment (CloudLinux Node.js selector) ───────────────────────
STEP="activating Node $NODE_VERSION environment"
[ -f "$VENV/bin/activate" ] || { log "Node environment not found at $VENV — create the app in 'Setup Node.js App' first."; false; }
set +u
# shellcheck source=/dev/null
source "$VENV/bin/activate"
set -u
mkdir -p "$APP_DIR"
cd "$APP_DIR"
[ -f .env ] || { log "Missing $APP_DIR/.env — create it from DEPLOYMENT.md first."; false; }

# ── 3. Database schema + packages ───────────────────────────────────────────
# CloudLinux keeps packages in the Node environment ($VENV/lib/node_modules) and
# links <app>/node_modules to it. Like cPanel's own "Run NPM Install", we install
# inside $VENV/lib so that link is never replaced by a real folder.
STEP="copying the Prisma schema"
SCHEMA_CHANGED=0
cmp -s "$SRC/prisma/schema.prisma" "$APP_DIR/prisma/schema.prisma" 2>/dev/null || SCHEMA_CHANGED=1
sync_dir "$SRC/prisma" "$APP_DIR/prisma"
cp "$SRC/package.json" "$APP_DIR/"  # needed by the npm/prisma commands below

# Compare with a saved copy: npm rewrites the lock file it installs from.
if ! cmp -s "$SRC/package-lock.json" "$STATE/package-lock.json" || [ ! -d "$VENV/lib/node_modules/next" ]; then
  STEP="installing packages"
  log "📦 Installing packages…"
  mkdir -p "$VENV/lib/node_modules"   # absent until the first install on a new app
  cp "$SRC/package.json" "$SRC/package-lock.json" "$VENV/lib/"
  ( cd "$VENV/lib" && npm install --omit=dev --ignore-scripts --no-audit --no-fund --loglevel=error )
  cp "$SRC/package-lock.json" "$STATE/package-lock.json"
  SCHEMA_CHANGED=1 # fresh packages need a freshly generated Prisma client
fi
[ -L "$APP_DIR/node_modules" ] || { rm -rf "$APP_DIR/node_modules"; ln -s "$VENV/lib/node_modules" "$APP_DIR/node_modules"; }

if [ "$SCHEMA_CHANGED" = 1 ]; then
  STEP="generating the Prisma client"
  npx --no-install prisma generate >/dev/null
fi

# ── 4. Database migrations (only new ones; never wipes data) ────────────────
STEP="applying database migrations"
log "🗄️  Applying database migrations…"
npx --no-install prisma migrate deploy

# The style menu lives in src/content/styles.ts; keep the database in step with it.
STEP="syncing the style menu"
sync_dir "$SRC/src" "$APP_DIR/src"
log "🌿 Syncing the style menu…"
npm run --silent db:seed

# ── 5. Swap in the new build ────────────────────────────────────────────────
STEP="copying the new build"
rm -rf "$APP_DIR/.next.new" "$APP_DIR/.next.old"
cp -a "$SRC/.next" "$APP_DIR/.next.new"
[ -d "$APP_DIR/.next" ] && mv "$APP_DIR/.next" "$APP_DIR/.next.old"
mv "$APP_DIR/.next.new" "$APP_DIR/.next"
sync_dir "$SRC/public" "$APP_DIR/public"
cp "$SRC/server.js" "$SRC/next.config.mjs" "$SRC/package.json" "$SRC/DEPLOY_VERSION" "$APP_DIR/"

# ── 6. Restart ──────────────────────────────────────────────────────────────
STEP="restarting the app"
mkdir -p "$APP_DIR/tmp"
touch "$APP_DIR/tmp/restart.txt"
if command -v cloudlinux-selector >/dev/null 2>&1; then
  cloudlinux-selector restart --json --interpreter nodejs --app-root "$(basename "$APP_DIR")" >/dev/null 2>&1 || true
fi

echo "$NEW" > "$STATE/deployed"
rm -f "$STATE/failed"
rm -rf "$APP_DIR/.next.old"
trap - ERR

# ── 7. Health check (also wakes the app up) ─────────────────────────────────
if [ -n "$HEALTH_URL" ]; then
  for _ in $(seq 1 12); do
    if curl -fsS --max-time 20 "$HEALTH_URL" 2>/dev/null | grep -q "\"version\":\"$VERSION\""; then
      log "✅ Live and healthy: ${VERSION:0:7}"
      exit 0
    fi
    sleep 5
  done
  log "⚠️  Deployed ${VERSION:0:7}, but $HEALTH_URL is not reporting it yet — check the app's logs in cPanel."
else
  log "✅ Deployed ${VERSION:0:7}"
fi
