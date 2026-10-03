#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Braids by Peace Joy — one-time server setup (cPanel + CloudLinux)
#
# Run it in cPanel → Terminal:
#   curl -fsSL https://raw.githubusercontent.com/bhoyee/-braidsbypeacejoy/main/deploy/bootstrap.sh -o ~/bbpj-bootstrap.sh && bash ~/bbpj-bootstrap.sh
#
# It creates the database, mailbox, Node.js app, settings file, Stripe webhook,
# runs the first deploy and installs the cron jobs. Safe to re-run at any time:
# it skips what already exists and only fills in what's missing.
# Secrets are written only to ~/bbpj-api/.env (chmod 600) — never printed.
# ─────────────────────────────────────────────────────────────────────────────
set -Eeuo pipefail

DOMAIN="${DOMAIN:-braidsbypeacejoy.com}"
REPO_URL="${REPO_URL:-https://github.com/bhoyee/-braidsbypeacejoy.git}"
APP_NAME="bbpj-api"
NODE_VERSION="22"
MAILBOX="bookings"
DB_HOST="${DB_HOST:-localhost}"

CPUSER="$(whoami)"
APP_DIR="$HOME/$APP_NAME"
ENV_FILE="$APP_DIR/.env"
DEPLOY_HOME="$HOME/bbpj-deploy"
DB_NAME="${CPUSER}_bbpj"
DB_USER="${CPUSER}_bbpj"
SITE_URL="https://$DOMAIN"

bold() { printf '\n\033[1;34m▶ %s\033[0m\n' "$*"; }
ok() { printf '  \033[32m✔\033[0m %s\n' "$*"; }
note() { printf '  \033[33m•\033[0m %s\n' "$*"; }
die() { printf '\n  \033[31m✘ %s\033[0m\n' "$*" >&2; exit 1; }
trap 'die "Setup stopped (line $LINENO). Copy everything above and send it to your developer."' ERR

# ── Tools ───────────────────────────────────────────────────────────────────
NODE_BIN="${NODE_BIN:-/opt/alt/alt-nodejs${NODE_VERSION}/root/usr/bin/node}"
[ -x "$NODE_BIN" ] || NODE_BIN="$(ls /opt/alt/alt-nodejs*/root/usr/bin/node 2>/dev/null | tail -1)"
for c in uapi cloudlinux-selector git curl openssl crontab; do
  command -v "$c" >/dev/null 2>&1 || die "Required tool '$c' is not available on this account. Ask your host to enable it."
done
[ -x "$NODE_BIN" ] || die "No Node.js found under /opt/alt — is 'Setup Node.js App' available on this account?"

# Read a value from JSON on stdin using a JS expression over `d` (prints "" if missing).
jget() { "$NODE_BIN" -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{let d;try{d=JSON.parse(s)}catch{d={}};let v;try{v=eval(process.argv[1])}catch{v=""};process.stdout.write(v==null?"":String(v))})' "$1"; }

# Run a cPanel UAPI call; succeed only if cPanel reports status 1.
uapi_call() {
  local out
  out="$(uapi --output=json "$@" </dev/null 2>/dev/null || true)"  # </dev/null: never eat the answers typed for the prompts
  if [ "$(printf '%s' "$out" | jget 'd.result&&d.result.status')" = "1" ]; then
    printf '%s' "$out"
    return 0
  fi
  printf '  cPanel said: %s\n' "$(printf '%s' "$out" | jget '(d.result&&d.result.errors||[]).join("; ")||"no response"')" >&2
  return 1
}

# Strong password with only letters and digits (safe inside URLs and .env files).
genpw() { printf 'Bb9%s' "$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 26)"; }

# .env helpers: get / set KEY="value" without ever echoing values.
env_get() { [ -f "$ENV_FILE" ] && sed -n "s/^$1=\"\(.*\)\"$/\1/p" "$ENV_FILE" | tail -1 || true; }
env_set() {
  local key="$1" val="$2" tmp
  tmp="$(mktemp)"
  { [ -f "$ENV_FILE" ] && grep -v "^$key=" "$ENV_FILE" || true; printf '%s="%s"\n' "$key" "$val"; } > "$tmp"
  mv "$tmp" "$ENV_FILE" && chmod 600 "$ENV_FILE"
}
# Prompts: an empty answer (or no input at all) falls back to the default instead of stopping the setup.
# Keys pressed while earlier steps were running are thrown away first, so they can't answer a question.
drain_input() { if [ -t 0 ]; then while read -r -t 0.2 -n 10000 _; do :; done; fi; }
ask() {
  local reply=""
  drain_input
  if [ -t 0 ]; then read -r -p "  $1 " reply || true; else read -r reply || true; fi
  printf '%s' "${reply:-$2}"
}
ask_secret() {
  local reply=""
  drain_input
  if [ -t 0 ]; then read -r -s -p "  $1 " reply || true; echo >&2; else read -r reply || true; fi
  printf '%s' "$reply"
}

echo
echo "  Braids by Peace Joy — server setup for $SITE_URL (account: $CPUSER)"
mkdir -p "$APP_DIR" "$DEPLOY_HOME"
touch "$ENV_FILE" && chmod 600 "$ENV_FILE"

# ── 1. Database ─────────────────────────────────────────────────────────────
bold "1/7  Database"
if uapi_call Mysql list_databases | jget 'd.result.data.map(x=>x.database).join("\n")' | grep -qx "$DB_NAME"; then
  ok "Database $DB_NAME already exists"
else
  uapi_call Mysql create_database name="$DB_NAME" >/dev/null
  ok "Created database $DB_NAME"
fi

DB_PASS="$(env_get DATABASE_URL | sed -n 's#^mysql://[^:]*:\([^@]*\)@.*#\1#p')"
if uapi_call Mysql list_users | jget 'd.result.data.map(x=>x.user).join("\n")' | grep -qx "$DB_USER"; then
  if [ -z "$DB_PASS" ]; then
    DB_PASS="$(genpw)"
    uapi_call Mysql set_password user="$DB_USER" password="$DB_PASS" >/dev/null
    ok "Database user $DB_USER exists — set a new password"
  else
    ok "Database user $DB_USER already exists"
  fi
else
  DB_PASS="$(genpw)"
  uapi_call Mysql create_user name="$DB_USER" password="$DB_PASS" >/dev/null
  ok "Created database user $DB_USER"
fi
uapi_call Mysql set_privileges_on_database user="$DB_USER" database="$DB_NAME" privileges="ALL PRIVILEGES" >/dev/null
env_set DATABASE_URL "mysql://$DB_USER:$DB_PASS@$DB_HOST:3306/$DB_NAME"
ok "Granted access and saved the connection settings"

# ── 2. Settings (.env) ──────────────────────────────────────────────────────
bold "2/7  Settings"
env_set NEXT_PUBLIC_SITE_URL "$SITE_URL"
[ -n "$(env_get CRON_SECRET)" ] || env_set CRON_SECRET "$(openssl rand -hex 32)"

if [ -z "$(env_get ADMIN_EMAIL)" ]; then
  env_set ADMIN_EMAIL "$(ask "Email address for booking alerts to the owner:" "")"
fi

STRIPE_KEY="$(env_get STRIPE_SECRET_KEY)"
if [[ "$STRIPE_KEY" != sk_* ]]; then
  echo "  Stripe secret key (Stripe → Developers → API keys). Starts with sk_test_ or sk_live_."
  STRIPE_KEY="$(ask_secret "Paste it (hidden; Enter to skip for now):")"
  if [[ "$STRIPE_KEY" == sk_* ]]; then env_set STRIPE_SECRET_KEY "$STRIPE_KEY"; ok "Stripe key saved"; else STRIPE_KEY=""; note "Stripe skipped — online payments won't work until you re-run this setup with a key"; fi
else
  ok "Stripe key already set ($( [[ "$STRIPE_KEY" == sk_live_* ]] && echo live || echo test ) mode)"
fi
ok "Settings saved to $ENV_FILE (private to your account)"

# ── 3. Mailbox for confirmation emails ──────────────────────────────────────
bold "3/7  Email for booking confirmations"
if [ -n "$(env_get SMTP_PASS)" ]; then
  ok "Email sending already configured"
else
  if uapi_call Email list_pops | jget 'd.result.data.map(x=>x.email).join("\n")' | grep -qx "$MAILBOX@$DOMAIN"; then
    note "$MAILBOX@$DOMAIN exists but its password isn't known to the site — resetting it for the website"
    MAIL_PASS="$(genpw)"
    uapi_call Email passwd_pop email="$MAILBOX" domain="$DOMAIN" password="$MAIL_PASS" >/dev/null
  else
    REPLY_MAIL="$(ask "Create mailbox $MAILBOX@$DOMAIN to send confirmations? [Y/n]" "y")"
    if [[ "$REPLY_MAIL" =~ ^[Yy] ]]; then
      MAIL_PASS="$(genpw)"
      uapi_call Email add_pop email="$MAILBOX" domain="$DOMAIN" password="$MAIL_PASS" quota=1024 >/dev/null
      ok "Created $MAILBOX@$DOMAIN"
    fi
  fi
  if [ -n "${MAIL_PASS:-}" ]; then
    env_set SMTP_HOST "$(hostname)"   # cPanel: the server hostname has a valid mail certificate
    env_set SMTP_PORT "465"
    env_set SMTP_USER "$MAILBOX@$DOMAIN"
    env_set SMTP_PASS "$MAIL_PASS"
    env_set EMAIL_FROM "Braids by Peace Joy <$MAILBOX@$DOMAIN>"
    ok "Email sending configured (from $MAILBOX@$DOMAIN)"
  else
    note "Skipped — emails will be logged instead of sent"
  fi
fi

# ── 4. Node.js application ──────────────────────────────────────────────────
bold "4/7  Node.js app on $DOMAIN"
if cloudlinux-selector get --json --interpreter nodejs </dev/null 2>/dev/null | grep -q "\"$APP_NAME\""; then
  ok "Node.js app $APP_NAME already exists"
else
  # Park the host's placeholder homepage so it can't shadow the app.
  for f in index.html index.htm index.php default.html; do
    if [ -f "$HOME/public_html/$f" ] && grep -qiE "under construction|coming soon|default web site page|cpanel" "$HOME/public_html/$f"; then
      mkdir -p "$DEPLOY_HOME/public_html-backup" && mv "$HOME/public_html/$f" "$DEPLOY_HOME/public_html-backup/"
      note "Moved placeholder page public_html/$f to $DEPLOY_HOME/public_html-backup/"
    fi
  done
  cloudlinux-selector create --json --interpreter nodejs --version "$NODE_VERSION" \
    --app-root "$APP_NAME" --domain "$DOMAIN" --app-uri "/" --app-mode production --startup-file server.js </dev/null >/dev/null \
    || die "Could not create the Node.js app. Create it in cPanel → Setup Node.js App (Node $NODE_VERSION, root $APP_NAME, URL $DOMAIN, startup file server.js), then re-run this setup."
  ok "Created Node.js $NODE_VERSION app (root: ~/$APP_NAME, startup file: server.js)"
fi
[ -f "$HOME/nodevenv/$APP_NAME/$NODE_VERSION/bin/activate" ] || die "Node environment ~/nodevenv/$APP_NAME/$NODE_VERSION not found — check the app's Node version is $NODE_VERSION in Setup Node.js App."

# ── 5. Stripe webhook ───────────────────────────────────────────────────────
bold "5/7  Stripe webhook"
WEBHOOK_URL="$SITE_URL/api/webhooks/stripe"
if [ -z "$STRIPE_KEY" ]; then
  note "Skipped (no Stripe key yet)"
elif [ -n "$(env_get STRIPE_WEBHOOK_SECRET)" ]; then
  ok "Webhook already configured"
else
  # Key goes in via stdin config, so it never appears in the process list.
  stripe_api() { curl -fsS -K - "$@" <<<"user = \"$STRIPE_KEY:\""; }
  stripe_api https://api.stripe.com/v1/balance >/dev/null 2>&1 \
    || die "Stripe rejected that secret key. Check it in Stripe → Developers → API keys, then re-run this setup."
  # The signing secret is only shown when an endpoint is created, so replace any old one for this URL.
  for id in $(stripe_api "https://api.stripe.com/v1/webhook_endpoints?limit=100" | jget "d.data.filter(e=>e.url===\"$WEBHOOK_URL\").map(e=>e.id).join(\" \")"); do
    stripe_api -X DELETE "https://api.stripe.com/v1/webhook_endpoints/$id" >/dev/null && note "Replaced an older webhook for this URL"
  done
  WH_SECRET="$(stripe_api https://api.stripe.com/v1/webhook_endpoints \
    -d url="$WEBHOOK_URL" -d description="Braids by Peace Joy website" \
    -d "enabled_events[]=checkout.session.completed" \
    -d "enabled_events[]=checkout.session.async_payment_succeeded" \
    -d "enabled_events[]=checkout.session.expired" | jget 'd.secret')"
  [[ "$WH_SECRET" == whsec_* ]] || die "Stripe didn't return a webhook secret — check the key is correct and has full access."
  env_set STRIPE_WEBHOOK_SECRET "$WH_SECRET"
  ok "Webhook created → $WEBHOOK_URL"
fi

# ── 6. First deploy ─────────────────────────────────────────────────────────
bold "6/7  Deploying the website (first time takes a few minutes)"
cat > "$DEPLOY_HOME/config" <<CFG
APP_DIR="$APP_DIR"
NODE_VERSION="$NODE_VERSION"
HEALTH_URL="$SITE_URL/api/health"
CFG
if [ ! -d "$DEPLOY_HOME/src/.git" ]; then
  git clone --quiet --depth 1 --single-branch --branch deploy "$REPO_URL" "$DEPLOY_HOME/src"
else
  # Make sure we run the newest deploy script (fixes ship through the deploy branch).
  git -C "$DEPLOY_HOME/src" fetch --quiet --depth 1 origin deploy && git -C "$DEPLOY_HOME/src" reset --quiet --hard FETCH_HEAD
fi
rm -f "$DEPLOY_HOME/state/failed" "$DEPLOY_HOME/state/deployed"   # always (re)deploy the latest build here
if ! bash "$DEPLOY_HOME/src/deploy/server-deploy.sh" </dev/null 2>&1 | tee -a "$DEPLOY_HOME/deploy.log" || [ ! -f "$DEPLOY_HOME/state/deployed" ]; then
  die "The first deploy did not complete — copy the messages above and send them to your developer."
fi

# ── 7. Cron jobs ────────────────────────────────────────────────────────────
bold "7/7  Automatic updates and reminders"
CRON_SECRET="$(env_get CRON_SECRET)"
{
  crontab -l 2>/dev/null | grep -v "# bbpj-" || true
  echo "*/2 * * * * /bin/bash $DEPLOY_HOME/src/deploy/server-deploy.sh >> $DEPLOY_HOME/deploy.log 2>&1 # bbpj-deploy"
  echo "* * * * * curl -fsS -H \"Authorization: Bearer $CRON_SECRET\" $SITE_URL/api/cron/reminders > /dev/null 2>&1 # bbpj-reminders"
} | crontab -
ok "Auto-deploy: checks GitHub every 2 minutes"
ok "Appointment reminders: run every minute"

# ── Done ────────────────────────────────────────────────────────────────────
trap - ERR
HEALTH="$(curl -fsS --max-time 30 "$SITE_URL/api/health" 2>/dev/null || true)"
echo
echo "  ─────────────────────────────────────────────────────────────"
if printf '%s' "$HEALTH" | grep -q '"ok":true'; then
  printf '  \033[32m✅ %s is live!\033[0m\n' "$SITE_URL"
else
  printf '  \033[33m⚠ Setup finished, but %s/api/health is not answering yet.\033[0m\n' "$SITE_URL"
  echo "    Give it a minute, then open the site. If it shows an error, send this output to your developer."
fi
echo "  Health:    $SITE_URL/api/health"
echo "  Deploy log: tail -50 $DEPLOY_HOME/deploy.log"
[ -n "$STRIPE_KEY" ] || echo "  To do:     re-run this setup with your Stripe secret key to enable payments."
echo "  To do:     Stripe Dashboard → Settings → Payment methods → turn on Cards, Apple Pay and Link."
echo "  ─────────────────────────────────────────────────────────────"
