# Deployment guide

The whole site (pages, booking API and MySQL database) runs on the **cPanel hosting** at `braidsbypeacejoy.com`. Every push to `main` deploys itself:

```
 push to main ──► GitHub Actions: type-check + build ──► publishes the `deploy` branch
                                                                │
 cPanel server ◄── every 2 minutes, cron runs deploy/server-deploy.sh:
   install packages (if changed) → database migrations → swap in the new build
   → restart → health check
                                                                │
 GitHub Actions "Go live" step waits until /api/health reports the new version ✅
```

* **No server passwords or keys are stored in GitHub.** The server pulls its own updates, which also means it works without SSH access.
* **If a deploy fails** (for example a broken migration), the previous version keeps running. The error is logged, and that build isn't retried until a fix is pushed.

---

## One-time setup (about 10 minutes)

### 1. Change your cPanel password

Go to cPanel → *Preferences → Password & Security*.

### 2. Run the setup command

Open cPanel → **Terminal**, paste this single line, and press Enter:

```bash
curl -fsSL https://raw.githubusercontent.com/bhoyee/-braidsbypeacejoy/main/deploy/bootstrap.sh -o ~/bbpj-bootstrap.sh && bash ~/bbpj-bootstrap.sh
```

It asks for a few things. Press **Enter** to skip any of them; you can re-run the command later to add them:

| Question | What to enter |
| --- | --- |
| Email address for booking alerts | The owner's email |
| Stripe secret key | Stripe → **Developers → API keys** → *Secret key* (`sk_test_…` to test, `sk_live_…` to take real payments). Typing is hidden. |
| Create mailbox bookings@braidsbypeacejoy.com? | **Y** (it sends the booking confirmations) |

Then it sets everything up by itself:

1. creates the **MySQL database and user**, with a strong generated password;
2. writes the private **settings file** `~/bbpj-api/.env`;
3. creates the **bookings@ mailbox** and connects it for sending email;
4. creates the **Node.js app** on `braidsbypeacejoy.com`, and moves the host's "Under Construction" page into a backup folder;
5. registers the **Stripe webhook** (if you gave a key);
6. runs the **first deploy**: database tables, style menu, start-up;
7. installs the **cron jobs**: auto-deploy every 2 minutes, and appointment reminders every minute.

It ends with **✅ https://braidsbypeacejoy.com is live!** If it stops with an ✘ instead, copy everything on the screen and send it to your developer.

### 3. One setting in Stripe

Go to Stripe Dashboard → **Settings → Payment methods** and turn on **Cards**, **Apple Pay** and **Link**.

That's it.

**Adding the Stripe key later, or switching from test to live:**

1. Edit the settings file: `nano ~/bbpj-api/.env`. Delete the `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` lines, then save (**Ctrl+O, Enter, Ctrl+X**).
2. Run `bash ~/bbpj-bootstrap.sh` again. It asks for the new key and creates the matching webhook.

---

## Day to day

**Deploying.** Push to `main`. Watch progress under **Actions** on GitHub. Changes are live in about 3–5 minutes.

**Adding or changing styles.** Edit **`src/content/styles.ts`**: one entry per style. Each entry has a name, category, price, time, photo, and a `popular` flag that decides whether it shows on the home page (keep about 8 there). To hide a style, set `hidden: true`. Push, and the deploy syncs the list into the database. Styles are never deleted, so past bookings keep their style.

**Adding or changing FAQs.** Edit **`src/content/faqs.ts`**: one entry per question, each with a topic (the tab it appears under), the answer, an optional "read more" link, and a `home` flag for the ~5 questions shown on the home page. Push to publish.

**Changing the database.** Edit `prisma/schema.prisma`, then on your computer run:

```bash
npm run db:migrate:new -- describe_the_change    # e.g. add_client_birthday
```

This creates a migration in `prisma/migrations/` and applies it to your local database. Commit it with your code and push. The server applies it automatically, before the new code goes live.

- **Never edit a migration that's already been deployed.** Add a new one instead.
- Migrations add or change things and never wipe data. The exception is a migration that **drops** a column or table, which deletes that data, so double-check those.

**Is it healthy?** Open https://braidsbypeacejoy.com/api/health. It shows the live version and whether the database connects.

**Server deploy log.** In Terminal: `tail -50 ~/bbpj-deploy/deploy.log`

## WhatsApp: chat button and owner alerts

Every page has a **"Chat with us"** WhatsApp button, and the owner can get a WhatsApp message for every booking, balance payment, 30-minute reminder and auto-refund, on top of the email. Everything is set in `~/bbpj-api/.env`, so you can test with your own number first and switch later without a redeploy.

1. **Get a free CallMeBot key** for the phone that should receive alerts:
   1. Save **+34 644 99 26 98** in that phone's contacts.
   2. Send it the WhatsApp message `I allow callmebot to send me messages`.
   3. Wait up to 2 minutes for a reply with your **API key**. If none arrives, try again after 24 hours.

   CallMeBot changes this number from time to time; the current one is on callmebot.com/blog/free-api-whatsapp-messages.
2. **Edit the settings:** run `nano ~/bbpj-api/.env` and add (or change) these lines:
   ```dotenv
   WHATSAPP_CHAT_NUMBER="14106711788"      # chat button: country code + number, digits only
   WHATSAPP_ALERT_NUMBER="+14106711788"    # who receives booking alerts
   CALLMEBOT_API_KEY="123456"              # the key CallMeBot sent
   ```
   Save with **Ctrl+O, Enter, Ctrl+X**.
3. **Restart the app:** cPanel → *Setup Node.js App* → **Restart**, or run `touch ~/bbpj-api/tmp/restart.txt`.
4. **Send a test alert:**
   ```bash
   S=$(sed -n 's/^CRON_SECRET="\(.*\)"$/\1/p' ~/bbpj-api/.env); curl -s -H "Authorization: Bearer $S" "https://braidsbypeacejoy.com/api/notify/test?channel=whatsapp"; echo
   ```
   `{"ok":true,...}` plus a WhatsApp message on the phone means it works. Use `channel=email` to test email alerts the same way.

To switch to Peace Joy's number later, repeat steps 1–3 with her phone. CallMeBot is free and unofficial, so alerts can occasionally be delayed. Email always stays on as well.

## Troubleshooting

All commands below run in cPanel → **Terminal**.

| Problem | Fix |
| --- | --- |
| GitHub's "Go live" step fails | `tail -50 ~/bbpj-deploy/deploy.log` names the step that failed. |
| A migration failed | Push a fix in a **new** migration. If Prisma then reports a *failed migration*, clear it first: `cd ~/bbpj-api && source ~/nodevenv/bbpj-api/22/bin/activate && npx prisma migrate resolve --rolled-back MIGRATION_FOLDER_NAME` |
| Redeploy the latest build | `rm -f ~/bbpj-deploy/state/deployed ~/bbpj-deploy/state/failed`, then wait 2 minutes (or run `bash ~/bbpj-deploy/src/deploy/server-deploy.sh`). |
| Undo a bad release | `git revert <commit>` and push. Database migrations are **not** undone automatically. |
| Site shows an error page | cPanel → *Setup Node.js App* → `bbpj-api` → **Restart**, and check its log file. |
| Re-sync the style menu by hand | `cd ~/bbpj-api && source ~/nodevenv/bbpj-api/22/bin/activate && npm run db:seed`. This also runs on every deploy. |
| Change a setting (email, Stripe, …) | `nano ~/bbpj-api/.env`, then restart the app (row above). |

## Optional later: faster pages in the US

The server is in London, so US visitors get a slight delay. Two ways to fix it:

- **Ask GiddyHost** to move the account to a **US server**. Everything moves with it; nothing needs to change.
- **Put Cloudflare's free plan** in front of the domain. It caches images, videos and pages near visitors.

## Owner area — Manage Bookings (`/manage`)

- Go to `https://braidsbypeacejoy.com/manage`, type the owner email (`ADMIN_EMAIL` in `.env`) and tap the link that arrives (valid 15 minutes, one use). You stay signed in for 30 days on that device.
- Any other email address gets the same "check your inbox" reply but no link is ever sent.
- "Sign out everywhere" logs out every phone/computer at once (use it if a device is lost).
- From a booking you can: record Cash App / Zelle / cash payments (client gets a receipt), mark completed or no-show (deposit kept), cancel (client is emailed; the deposit is kept unless you tick "Refund the deposit"), and keep private notes.
- Optional: set `ADMIN_SESSION_SECRET` in `.env` to a long random string; otherwise one is derived from `CRON_SECRET`.
