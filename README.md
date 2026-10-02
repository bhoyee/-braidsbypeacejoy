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
npm run db:migrate:deploy     # create tables from prisma/migrations
npm run db:seed               # sample style menu (edit prices in prisma/seed.ts)
npm run dev

# second terminal: forward Stripe webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# copy the printed whsec_… into STRIPE_WEBHOOK_SECRET
```

Leave `API_ORIGIN` unset locally so one process serves both the pages and the API.

## Deployment (CI/CD)

Every push to `main` deploys automatically:

1. **GitHub Actions** builds the site and publishes it to the `deploy` branch.
2. **The cPanel server** pulls that branch every 2 minutes. It installs packages, applies database migrations and restarts.
3. **Vercel** gets the frontend once the backend reports the new version.

Full setup, day-to-day usage and troubleshooting are in **[DEPLOYMENT.md](DEPLOYMENT.md)**.

**Database changes:** edit `prisma/schema.prisma`, run `npm run db:migrate:new -- short_name`, and commit the new folder in `prisma/migrations/`. The server applies it on the next deploy.

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
