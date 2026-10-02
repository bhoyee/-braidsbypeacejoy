# Deployment guide

How Braids by Peace Joy goes live, and how every push to `main` deploys itself.

```
 push to main ──► GitHub Actions
                   1. type-check + build
                   2. publish the build to the `deploy` branch
                   3. wait until the server reports the new version
                   4. deploy the frontend to Vercel
                          │
 cPanel server (GiddyHost) │  every 2 minutes, cron runs deploy/server-deploy.sh:
   pulls `deploy` ◄────────┘  install packages (if changed) → database migrations
                              → swap in the new build → restart → health check
```

* **Frontend:** `braidsbypeacejoy.com` on **Vercel**.
* **Backend API and database:** `api.braidsbypeacejoy.com` on **cPanel** (Node.js app + MySQL).

The server *pulls* its updates, so no server passwords or keys are stored in GitHub. That's also why this works even though GiddyHost doesn't allow SSH in from outside.

If a deploy fails (for example a broken migration), **the previous version keeps running**. The error is logged, and that build isn't retried until you push a fix.

---

## One-time setup

Do the parts **in this order**. It takes about 45 minutes.

### Part 1: GitHub (first build)

1. Open the repo on GitHub and go to **Settings → Secrets and variables → Actions → Variables tab → New repository variable**:

   | Name | Value |
   | --- | --- |
   | `SITE_URL` | `https://braidsbypeacejoy.com` |

   Don't add `API_ORIGIN` yet. That comes in Part 4.
2. Go to **Actions → Deploy → Run workflow** (or push any commit to `main`).

   The **Check & build** job should go green. It creates the `deploy` branch that the server will pull from. "Wait for backend" is skipped for now, which is expected.

### Part 2: cPanel

You can reach cPanel at `https://braidsbypeacejoy.com:2083`. Once the domain points to Vercel (Part 5), use `https://server.giddyhost.com:2083` instead.

**2.1 Change your cPanel password**

Go to *Preferences → Password & Security*. The old one was shared in a chat.

**2.2 Database**

In *MySQL® Databases*:

1. Create a database, e.g. `bbpj`. cPanel names it `braidsby_bbpj`.
2. Create a user, e.g. `bbpj`. cPanel names it `braidsby_bbpj`. Use a strong password, and stick to letters and numbers so you don't have to URL-encode symbols.
3. Under **Add User To Database**, add the user to the database and tick **ALL PRIVILEGES**.

**2.3 API subdomain**

1. In *Domains*, click **Create A New Domain** and enter `api.braidsbypeacejoy.com`. Keep the suggested document root.
2. In *SSL/TLS Status*, tick the new subdomain and click **Run AutoSSL**, so it gets HTTPS.

**2.4 Node.js app**

In *Setup Node.js App*, click **Create Application**:

| Field | Value |
| --- | --- |
| Node.js version | **22.x** |
| Application mode | Production |
| Application root | `bbpj-api` |
| Application URL | `api.braidsbypeacejoy.com` |
| Application startup file | `server.js` |

Click **Create**.

- Don't click "Run NPM Install". The deploy script does that.
- The page shows a command like `source /home/braidsby/nodevenv/bbpj-api/22/bin/activate`. Check that it ends in `/22/`.

**2.5 Server settings (`.env`)**

Open *Terminal* and run:

```bash
openssl rand -hex 32    # copy the output: this is your CRON_SECRET
nano ~/bbpj-api/.env
```

Paste the following, filling in your values:

```dotenv
DATABASE_URL="mysql://braidsby_bbpj:YOUR_DB_PASSWORD@localhost:3306/braidsby_bbpj"
NEXT_PUBLIC_SITE_URL="https://braidsbypeacejoy.com"

STRIPE_SECRET_KEY="sk_test_..."          # Stripe → Developers → API keys (use live keys at launch)
STRIPE_WEBHOOK_SECRET="whsec_..."        # from step 6.2 below; fill in later
CRON_SECRET="paste-the-openssl-output"

ADMIN_EMAIL="owner@braidsbypeacejoy.com"
ADMIN_PHONE="+14106711788"

# cPanel → Email Accounts → (create bookings@braidsbypeacejoy.com) → Connect Devices
SMTP_HOST="mail.braidsbypeacejoy.com"
SMTP_PORT="465"
SMTP_USER="bookings@braidsbypeacejoy.com"
SMTP_PASS="EMAIL_ACCOUNT_PASSWORD"
EMAIL_FROM="\"Braids by Peace Joy\" <bookings@braidsbypeacejoy.com>"

# Optional: text messages (Twilio)
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_FROM_NUMBER=""
```

Save with **Ctrl+O, Enter**, then exit with **Ctrl+X**. Then lock the file down:

```bash
chmod 600 ~/bbpj-api/.env
```

**2.6 Install the deploy script and run the first deploy**

Still in Terminal:

```bash
mkdir -p ~/bbpj-deploy
git clone --depth 1 -b deploy https://github.com/bhoyee/-braidsbypeacejoy.git ~/bbpj-deploy/src
echo 'HEALTH_URL=https://api.braidsbypeacejoy.com/api/health' > ~/bbpj-deploy/config
bash ~/bbpj-deploy/src/deploy/server-deploy.sh
```

The first run takes a few minutes. It installs packages, creates the database tables, loads the style menu, and ends with **✅ Live and healthy**.

Check it: open `https://api.braidsbypeacejoy.com/api/health`. It should show `"ok":true`.

**2.7 Cron jobs**

In *Cron Jobs*, add these two, both with *Common Settings → Once Per Minute*. Then edit the first job's minute field to `*/2`.

```
*/2 * * * *  /bin/bash /home/braidsby/bbpj-deploy/src/deploy/server-deploy.sh >> /home/braidsby/bbpj-deploy/deploy.log 2>&1
```
```
* * * * *    curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://api.braidsbypeacejoy.com/api/cron/reminders > /dev/null 2>&1
```

The first is the auto-deploy. The second sends 30-minute appointment reminders.

### Part 3: Vercel (frontend)

1. Create a free account at vercel.com.
2. On your computer, in the project folder, run:
   ```bash
   npx vercel login
   npx vercel link        # "Link to existing project?" No → name it braidsbypeacejoy
   ```
   This creates `.vercel/project.json`, which contains `orgId` and `projectId`. That file is git-ignored.
3. In the Vercel dashboard, open the project and go to **Settings → Environment Variables**. Add these for **Production**:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SITE_URL` | `https://braidsbypeacejoy.com` |
   | `API_ORIGIN` | `https://api.braidsbypeacejoy.com` |

4. Create a token at **vercel.com/account/tokens**.

`vercel.json` turns off Vercel's own auto-deploys, so only the pipeline deploys, and only after the backend is ready.

### Part 4: GitHub (finish)

1. Go to **Settings → Secrets and variables → Actions**.
   - **Variables:** add `API_ORIGIN` = `https://api.braidsbypeacejoy.com`.
   - **Secrets:** add these three.

     | Name | Value |
     | --- | --- |
     | `VERCEL_TOKEN` | token from step 3.4 |
     | `VERCEL_ORG_ID` | `orgId` from `.vercel/project.json` |
     | `VERCEL_PROJECT_ID` | `projectId` from `.vercel/project.json` |

2. Go to **Actions → Deploy → Run workflow**. All three jobs should go green. The last one prints the Vercel URL. Open it and check the site.

### Part 5: Point the domain to Vercel

Do this once you're happy with the site at the Vercel URL.

1. In Vercel, open the project and go to **Settings → Domains**. Add `braidsbypeacejoy.com` and `www.braidsbypeacejoy.com`.
2. In cPanel, open **Zone Editor** and click **Manage** next to `braidsbypeacejoy.com`.

   **Change these:**

   | Record | Type | Set it to |
   | --- | --- | --- |
   | `braidsbypeacejoy.com.` | A | `76.76.21.21` |
   | `www.braidsbypeacejoy.com.` | CNAME | `cname.vercel-dns.com.` (delete any `www` A record first) |

   **Don't touch:** `api`, `mail`, the **MX** records, `ftp`, `cpanel`, or `webmail`.

   If Vercel shows different values in its Domains screen, use Vercel's.
3. DNS can take up to a few hours to update. After that, cPanel is at `https://server.giddyhost.com:2083`.

### Part 6: Stripe

1. In **Settings → Payment methods**, turn on **Cards**, **Apple Pay** and **Link**.
2. In **Developers → Webhooks → Add endpoint**:
   - URL: `https://api.braidsbypeacejoy.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`

   Copy the **signing secret** (`whsec_…`) into `STRIPE_WEBHOOK_SECRET` in `~/bbpj-api/.env`, then restart the app (*Setup Node.js App → Restart*).
3. At launch, swap the test keys (`sk_test_…`) for live keys (`sk_live_…`), and create the webhook again in **live mode**.

---

## Day to day

**Deploying.** Push to `main`. Watch progress under **Actions** on GitHub. Changes are live in about 3–5 minutes.

**Changing the database.** Edit `prisma/schema.prisma`, then on your computer run:

```bash
npm run db:migrate:new -- describe_the_change    # e.g. add_client_birthday
```

This creates a migration in `prisma/migrations/` and applies it to your local database. Commit it with your code and push. The server applies it automatically, before the new code goes live.

- **Never edit a migration that's already been deployed.** Make a new one instead.
- Migrations only add or change things. Data is never wiped. A migration that *drops* a column or table will delete that data, so double-check those before pushing.

**Server deploy log.** In cPanel → Terminal:

```bash
tail -50 ~/bbpj-deploy/deploy.log
```

**Is it healthy?** Open `https://api.braidsbypeacejoy.com/api/health`. It shows the live commit and whether the database connects.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| "Wait for backend" times out | Read `tail -50 ~/bbpj-deploy/deploy.log`. The log names the step that failed. |
| Log says `Missing …/.env` or `Node environment not found` | Redo step 2.5 or 2.4. |
| A migration failed | Fix it in a **new commit** and push. If Prisma then reports a *failed migration*, mark it rolled back first: `cd ~/bbpj-api && source ~/nodevenv/bbpj-api/22/bin/activate && npx prisma migrate resolve --rolled-back MIGRATION_FOLDER_NAME` |
| Need to redeploy the same build | `rm ~/bbpj-deploy/state/deployed ~/bbpj-deploy/state/failed` (then wait 2 min, or run the script by hand) |
| Roll back a bad release | `git revert <commit>` and push. Database migrations are **not** undone automatically. |
| Reload the starter style menu | `cd ~/bbpj-api && source ~/nodevenv/bbpj-api/22/bin/activate && npm run db:seed`. ⚠️ This overwrites the prices of the starter styles. |
| App shows an error page | cPanel → *Setup Node.js App* → open the app → check the log file; or click **Restart**. |
