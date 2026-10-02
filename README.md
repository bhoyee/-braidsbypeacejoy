# Braidsbypeacejoy

Booking and payments site for Braidsbypeacejoy, 8700 Liberty Rd, Randallstown, MD (PHENIX Salon Suite 101).

Built with Next.js 16 (App Router), Prisma 6 + MySQL, Stripe Checkout (USD) and Tailwind CSS 4.

## How it fits together

```
Browser ──► Vercel (pages, edge CDN)
              │  /api/*  ── rewrite (beforeFiles) ──►  cPanel Node app (same codebase)
              │                                          ├─ Prisma ─► cPanel MySQL
              │                                          ├─ Stripe API
Stripe ───────────── webhook ───────────────────────────►├─ /api/webhooks/stripe
cPanel cron (every minute) ─────────────────────────────►└─ /api/cron/reminders
```

The same repository deploys to both hosts:

* **Vercel** has `API_ORIGIN` set. Every `/api/*` call is proxied to cPanel, so the browser only talks to one origin and no CORS setup is needed. The style menu is fetched from the API and cached for 5 minutes (ISR).
* **cPanel** has `API_ORIGIN` unset. It serves the API routes itself, right next to MySQL.

## Booking and payment lifecycle

1. **Availability.** `GET /api/availability` returns every 30-minute start time from 8:00 AM to 6:30 PM (Eastern). Each slot is marked `available`, `booked`, `after-hours` (the style would finish after 7 PM) or `past`. A slot counts as booked if it overlaps a `DEPOSIT_PAID` or `FULLY_SETTLED` booking, or an active checkout hold.
2. **Deposit.** `POST /api/checkout` rechecks the slot inside a MySQL row lock (`scheduler_lock`, `SELECT … FOR UPDATE`). It then writes a `PENDING_DEPOSIT` hold that lasts exactly as long as the Stripe session (31 minutes), and creates a Checkout Session for **3000 cents** with all the metadata. Two clients can never pay for the same slot.
3. **Confirmation.** The booking becomes `DEPOSIT_PAID` only after Stripe proves the payment. Two paths lead there:
   * the webhook (`checkout.session.completed`), and
   * the success page's instant check (`/api/checkout/status`).

   Both call the same idempotent `confirmCheckoutSession()`, so whichever arrives first wins and confirmation emails are sent exactly once. If a payment can't be honoured (for example a duplicate balance payment), it is refunded automatically and the admin is alerted.
4. **Cancel or abandon.** If the client presses "back" on Stripe, the session is expired and the slot is freed immediately. An abandoned session frees the slot through `checkout.session.expired` or the cron sweep.
5. **Balance.** On `/pay`, the client looks up their booking by email or booking code (`PJ-XXXXXX`). The page shows the style total minus the amount already paid, and Stripe Checkout settles the rest, which sets the booking to `FULLY_SETTLED`.

## Local development

```bash
npm install
cp .env.example .env          # fill DATABASE_URL + Stripe test keys
npx prisma db push            # create tables
npm run db:seed               # sample style menu (edit prices in prisma/seed.ts)
npm run dev

# second terminal: forward Stripe webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# copy the printed whsec_… into STRIPE_WEBHOOK_SECRET
```

Leave `API_ORIGIN` unset locally so one process serves both the pages and the API.

## Deploying the backend (cPanel)

1. Go to **MySQL Databases**. Create the database and user, and grant the user all privileges.
2. Go to **Setup Node.js App**:
   * Node version: 20 or newer
   * Application root: the uploaded folder
   * Startup file: `server.js`
   * Domain: e.g. `api.braidsbypeacejoy.com`
3. Add the environment variables from `.env.example`, **without** `API_ORIGIN`.
4. Build. Shared hosting usually doesn't have enough RAM for `next build`, so build locally or in CI with `npm run build`, then upload the project including `.next/`. On the server, run `npm install --omit=dev` (the `postinstall` step generates Prisma), then `npx prisma migrate deploy` (or `db push`) and `npm run db:seed`.
5. Restart the app.
6. In **Stripe → Developers → Webhooks**, add `https://api.braidsbypeacejoy.com/api/webhooks/stripe` with these events:
   * `checkout.session.completed`
   * `checkout.session.async_payment_succeeded`
   * `checkout.session.expired`

   Put the signing secret in `STRIPE_WEBHOOK_SECRET`. Point Stripe straight at the API host, not through Vercel.
7. In **Stripe → Settings → Payment methods**, enable **Cards**, **Apple Pay** and **Link**. Checkout is restricted to `card` (which includes Apple Pay and Google Pay wallets) and `link`.
8. In **Cron Jobs**, add a job that runs every minute:

   ```
   * * * * * curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://api.braidsbypeacejoy.com/api/cron/reminders >/dev/null 2>&1
   ```

   This sends the client and admin reminders 30 minutes before each appointment and clears stale holds.

## Deploying the frontend (Vercel)

Import the repo and set these environment variables:

* `NEXT_PUBLIC_SITE_URL=https://braidsbypeacejoy.com`
* `API_ORIGIN=https://api.braidsbypeacejoy.com`

No database or Stripe secrets are needed on Vercel.

## Notifications

`src/lib/notifications.ts` sends:

* email through your cPanel mailbox (SMTP / nodemailer), and
* SMS through Twilio's REST API.

Each channel is optional: if its credentials are missing, the message is logged and skipped. Notification failures never undo a payment.

## Brand assets

See [public/assets/README.md](public/assets/README.md). Add these files:

* `hero-video.mp4` and `hero-poster.jpg`
* the real logo
* style photos (set `imageUrl` on each service)

## Business rules (`src/lib/config.ts`)

| Constant | Value |
| --- | --- |
| Deposit | `DEPOSIT_CENTS = 3000` |
| Hours | `OPEN_MINUTE = 8:00`, `CLOSE_MINUTE = 19:00` (the style must finish by close) |
| Slot step | 30 min |
| Minimum notice | `MIN_LEAD_MINUTES = 120` |
| Booking window | `MAX_DAYS_AHEAD = 90` |
| Reminder | 30 min before |
