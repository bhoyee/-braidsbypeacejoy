import Link from "next/link";
import { redirect } from "next/navigation";
import { TestAlert } from "@/components/manage/TestAlert";
import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { adminEmails, envFileChangedAt, mangledByEnvLoader, secret } from "@/lib/secrets";
import { formatSalonDate, formatSalonTime } from "@/lib/time";

export const dynamic = "force-dynamic";

const mask = (v: string | undefined, keep = 4) => (v ? `${"•".repeat(Math.max(0, Math.min(8, v.length - keep)))}${v.slice(-keep)}` : "");

/** Owner-only check of how booking alerts are set up, with test buttons and recent results. */
export default async function AlertsPage() {
  if (!(await isAdmin())) redirect("/manage");
  // Email / WhatsApp values exactly as the alerts read them (straight from .env).
  const env = {
    ADMIN_EMAIL: adminEmails().join(", ") || undefined,
    SMTP_HOST: secret("SMTP_HOST"),
    SMTP_PORT: secret("SMTP_PORT"),
    SMTP_USER: secret("SMTP_USER"),
    SMTP_PASS: secret("SMTP_PASS"),
    WHATSAPP_ALERT_NUMBER: secret("WHATSAPP_ALERT_NUMBER"),
    CALLMEBOT_API_KEY: secret("CALLMEBOT_API_KEY"),
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  };
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
  const userLooksWrong = !!env.SMTP_USER && !env.SMTP_USER.includes("@");
  const specialChars = !!env.SMTP_PASS && /[$#"'\\]/.test(env.SMTP_PASS);
  const changedAt = envFileChangedAt();

  const checks = [
    { group: "Email", label: "Owner email(s) (ADMIN_EMAIL)", ok: !!env.ADMIN_EMAIL, value: env.ADMIN_EMAIL ?? "missing" },
    { group: "Email", label: "Mail server (SMTP_HOST)", ok: !!env.SMTP_HOST, value: env.SMTP_HOST ? `${env.SMTP_HOST}:${env.SMTP_PORT ?? 465}` : "missing" },
    {
      group: "Email",
      label: "Mailbox login (SMTP_USER / SMTP_PASS)",
      ok: !!(env.SMTP_USER && env.SMTP_PASS) && !userLooksWrong,
      value: env.SMTP_USER
        ? `${env.SMTP_USER}${userLooksWrong ? " (should be the full email address)" : ""} · password ${env.SMTP_PASS ? `set, ${env.SMTP_PASS.length} characters` : "missing"}`
        : "missing",
    },
    { group: "WhatsApp", label: "Alert number (WHATSAPP_ALERT_NUMBER)", ok: !!env.WHATSAPP_ALERT_NUMBER, value: env.WHATSAPP_ALERT_NUMBER ?? "missing" },
    { group: "WhatsApp", label: "CallMeBot key (CALLMEBOT_API_KEY)", ok: !!env.CALLMEBOT_API_KEY, value: env.CALLMEBOT_API_KEY ? mask(env.CALLMEBOT_API_KEY, 3) : "missing" },
    {
      group: "Payments",
      label: "Stripe key (STRIPE_SECRET_KEY)",
      ok: /^[sr]k_(live|test)_/.test(stripeKey),
      value: /^[sr]k_live_/.test(stripeKey)
        ? `live mode${stripeKey.startsWith("rk_") ? " (restricted key)" : ""}`
        : /^[sr]k_test_/.test(stripeKey)
          ? "TEST mode — no real payments"
          : "missing — bookings can't be paid, so no alerts are sent",
    },
    { group: "Payments", label: "Stripe webhook (STRIPE_WEBHOOK_SECRET)", ok: !!env.STRIPE_WEBHOOK_SECRET, value: env.STRIPE_WEBHOOK_SECRET ? "set" : "missing" },
  ];

  const since = new Date(Date.now() - 14 * 86_400_000);
  const [recentAlerts, unpaid] = await Promise.all([
    prisma.activityLog.findMany({
      where: { action: { contains: "alerts" }, createdAt: { gt: since } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { booking: { select: { id: true, clientName: true, bookingCode: true } } },
    }),
    prisma.booking.count({ where: { paymentStatus: { in: ["PENDING_DEPOSIT", "EXPIRED"] }, createdAt: { gt: since } } }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8">
      <Link href="/manage" className="text-sm font-semibold text-royal-700 hover:underline">
        ← All bookings
      </Link>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-royal-700">Owner area</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-navy-900 sm:text-4xl">Alerts check</h1>
      <p className="mt-2 text-sm text-navy-900/70">
        Alerts go out when a client&apos;s $30 deposit is confirmed by Stripe — not when someone only starts booking. Use this page to check the
        setup and send yourself a test.
      </p>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy-900/5">
        <h2 className="font-display text-xl text-navy-900">Settings on the server</h2>
        <ul className="mt-3 divide-y divide-navy-900/5 text-sm">
          {checks.map((c) => (
            <li key={c.label} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span className="text-navy-900">
                <span className="mr-2 text-xs font-semibold uppercase tracking-wider text-navy-900/40">{c.group}</span>
                {c.label}
              </span>
              <span className={`font-mono text-xs ${c.ok ? "text-green-700" : "font-semibold text-red-700"}`}>
                {c.ok ? "✓ " : "✗ "}
                {c.value}
              </span>
            </li>
          ))}
        </ul>
        {(specialChars || mangledByEnvLoader("SMTP_PASS")) && (
          <p className="mt-3 rounded-xl bg-gold-200/50 p-3 text-xs text-navy-900">
            The mailbox password contains special characters such as <code>$</code> or <code>#</code>. That&apos;s fine — alerts read it exactly as
            written in .env. Just make sure it&apos;s inside double quotes: <code>SMTP_PASS=&quot;…&quot;</code>.
          </p>
        )}
        <p className="mt-3 text-xs text-navy-900/50">
          Email and WhatsApp settings are read from .env each time, so changes work straight away — no restart needed.
          {changedAt && <> .env last saved {formatSalonDate(changedAt)} {formatSalonTime(changedAt)}.</>}
        </p>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy-900/5">
          <h2 className="font-display text-xl text-navy-900">Test email</h2>
          <p className="mb-4 mt-1 text-sm text-navy-900/60">Sends a test to {env.ADMIN_EMAIL ?? "the owner email"}.</p>
          <TestAlert channel="email" label="Send test email" />
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy-900/5">
          <h2 className="font-display text-xl text-navy-900">Test WhatsApp</h2>
          <p className="mb-4 mt-1 text-sm text-navy-900/60">Sends a test to {env.WHATSAPP_ALERT_NUMBER ?? "the alert number"} via CallMeBot.</p>
          <TestAlert channel="whatsapp" label="Send test WhatsApp" />
        </div>
      </section>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy-900/5">
        <h2 className="font-display text-xl text-navy-900">Recent alert results (14 days)</h2>
        {unpaid > 0 && (
          <p className="mt-2 rounded-xl bg-gold-200/50 p-3 text-sm text-navy-900">
            {unpaid} checkout{unpaid === 1 ? " was" : "s were"} started but the deposit was never paid — those don&apos;t send alerts.
          </p>
        )}
        {recentAlerts.length === 0 ? (
          <p className="mt-2 text-sm text-navy-900/60">No confirmed bookings or reminders in the last 14 days.</p>
        ) : (
          <ul className="mt-3 space-y-3 text-sm">
            {recentAlerts.map((a) => (
              <li key={a.id} className="rounded-xl bg-cream p-3">
                <p className="text-xs text-navy-900/50">
                  {formatSalonDate(a.createdAt)} {formatSalonTime(a.createdAt)} ·{" "}
                  {a.booking ? (
                    <Link href={`/manage/b/${a.booking.id}`} className="font-semibold text-royal-700 hover:underline">
                      {a.booking.clientName} ({a.booking.bookingCode})
                    </Link>
                  ) : null}{" "}
                  · {a.action}
                </p>
                <p className="mt-1 text-navy-900">{a.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
