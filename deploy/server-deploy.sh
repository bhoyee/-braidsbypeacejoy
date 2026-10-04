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

# LiteSpeed runs the app as "lsnode:<app dir>/" processes. A restart starts a NEW
# process but doesn't always stop the old one, so copies pile up until the account's
# thread limit is hit (then git, Prisma and even DB connections fail).
app_pids() { pgrep -f "lsnode:${APP_DIR}/" 2>/dev/null || true; }
stop_old_app_copies() { # keep only the newest copy running
  local newest pid n=0
  newest="$(pgrep -n -f "lsnode:${APP_DIR}/" 2>/dev/null || true)"
  for pid in $(app_pids); do
    [ "$pid" = "$newest" ] && continue
    kill "$pid" 2>/dev/null && n=$((n + 1))
  done
  [ "$n" -gt 0 ] && log "🧹 Stopped $n stale copies of the app"
  return 0
}

export PRISMA_HIDE_UPDATE_MESSAGE=1 NPM_CONFIG_UPDATE_NOTIFIER=false NEXT_TELEMETRY_DISABLED=1
# Shared hosting (CloudLinux) caps threads per account, but several tools start one
# thread per CPU core and crash when refused: Prisma's engine ("PANIC: timer has
# gone away"), esbuild/tsx ("runtime.newosproc"), and Node's own worker pool.
# Keep all of them small.
export TOKIO_WORKER_THREADS=2          # Prisma query engine (Rust/tokio)
export GOMAXPROCS=2                    # esbuild, used by tsx for the style sync (Go)
export NODE_OPTIONS="--v8-pool-size=2 ${NODE_OPTIONS:-}"   # Node/V8 background threads
export UV_THREADPOOL_SIZE=2            # Node/libuv file & DNS threads

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
  git -c pack.threads=1 clone --quiet --depth 1 --single-branch --branch "$BRANCH" "$REPO_URL" "$SRC"
else
  # pack.threads=1: git's unpacking otherwise starts a thread per CPU core.
  git -C "$SRC" -c pack.threads=1 fetch --quiet --depth 1 origin "$BRANCH"
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
stop_old_app_copies   # free threads before installing / migrating

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

# Settings added by newer releases: append any that are missing, with their default.
# Values already in .env are never changed — edit .env to customise them.
env_default() {
  [ -z "$(tail -c1 .env)" ] || echo >> .env # make sure the last line ends with a newline
  grep -q "^$1=" .env || { printf '%s="%s"\n' "$1" "$2" >> .env; log "Added $1 to .env (default: \"$2\")"; }
}
env_default RETENTION_DAYS "90"         # days after the last visit before the "time for a refresh?" email
env_default GOOGLE_REVIEW_URL ""        # Google Business Profile → "Ask for reviews" link; empty = Google Maps

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
# Thread caps for the running website (see server.js). NODE_OPTIONS must be set on
# the app itself because V8 reads it at start-up, before any of our code runs.
if command -v cloudlinux-selector >/dev/null 2>&1; then
  cloudlinux-selector set --json --interpreter nodejs --app-root "$(basename "$APP_DIR")"     --env-vars '{"NODE_OPTIONS":"--v8-pool-size=2","UV_THREADPOOL_SIZE":"2","VIPS_CONCURRENCY":"1","TOKIO_WORKER_THREADS":"2"}'     </dev/null >/dev/null 2>&1 || log "⚠️  Could not set the app's thread limits (server.js still applies most of them)"
fi
mkdir -p "$APP_DIR/tmp"
touch "$APP_DIR/tmp/restart.txt"
# Stop every running copy; LiteSpeed starts one fresh process on the next request
# (the health check below makes that request).
for pid in $(app_pids); do kill "$pid" 2>/dev/null || true; done
sleep 2
for pid in $(app_pids); do kill -9 "$pid" 2>/dev/null || true; done
if command -v cloudlinux-selector >/dev/null 2>&1; then
  cloudlinux-selector restart --json --interpreter nodejs --app-root "$(basename "$APP_DIR")" >/dev/null 2>&1 || true
fi

echo "$NEW" > "$STATE/deployed"
rm -f "$STATE/failed"
rm -rf "$APP_DIR/.next.old"
trap - ERR

# Empty the hosting's LiteSpeed page cache so the new release shows immediately.
purge_page_cache() {
  local secret
  secret="$(sed -n 's/^CRON_SECRET="\(.*\)"$/\1/p' "$APP_DIR/.env" | tail -1)"
  [ -n "$secret" ] || return 0
  if curl -fsS --max-time 20 -K - "${HEALTH_URL%/api/health}/api/cache/purge" <<<"header = \"Authorization: Bearer $secret\"" >/dev/null 2>&1; then
    log "🧹 Page cache cleared"
  else
    log "⚠️  Could not clear the page cache (pages may take up to 10 minutes to update)"
  fi
}

# ── 7. Health check (also wakes the app up) ─────────────────────────────────
if [ -n "$HEALTH_URL" ]; then
  purge_page_cache
  for _ in $(seq 1 12); do
    # Cache-buster: make sure we ask the app itself, not a cached copy.
    if curl -fsS --max-time 20 -H "Cache-Control: no-cache" "$HEALTH_URL?t=$(date +%s%N)" 2>/dev/null | grep -q "\"version\":\"$VERSION\""; then
      log "✅ Live and healthy: ${VERSION:0:7}"
      purge_page_cache   # once more, now that the new app is answering
      exit 0
    fi
    sleep 5
  done
  log "⚠️  Deployed ${VERSION:0:7}, but $HEALTH_URL is not reporting it yet — check the app's logs in cPanel."
else
  log "✅ Deployed ${VERSION:0:7}"
fi
