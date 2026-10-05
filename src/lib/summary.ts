import "server-only";
import { esc, renderEmail, siteBase } from "./email-template";
import { sendEmail, sendWhatsAppAlert } from "./notifications";
import { prisma } from "./prisma";
import { adminEmails } from "./secrets";
import { addDaysToKey, formatSalonDate, formatSalonTime, formatUSD, salonDateKey, salonMinuteOfDay, salonTimeToUtc } from "./time";

// Evening summary for the owner (email to every ADMIN_EMAIL + WhatsApp), once a day
// after closing. Run from the every-minute cron; claimed in the Setting table so it
// is sent once per salon day even if several cron runs overlap.

const SEND_AT_MINUTE = 20 * 60; // 8:00 PM salon time (the salon closes at 7)
const KEY = "daily_summary_date";
const ACTIVE = ["DEPOSIT_PAID", "FULLY_SETTLED"] as const;

const short = (d: Date) => formatSalonTime(d).replace(/ E[DS]T$/, "");
const balanceOf = (b: { totalCents: number; amountPaidCents: number }) => Math.max(0, b.totalCents - b.amountPaidCents);

async function claimToday(today: string) {
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  if (row?.value === today) return false;
  if (!row) return prisma.setting.create({ data: { key: KEY, value: today } }).then(() => true).catch(() => false);
  const c = await prisma.setting.updateMany({ where: { key: KEY, value: row.value }, data: { value: today } });
  return c.count === 1;
}

export async function sendDailySummary(now = new Date()) {
  if (salonMinuteOfDay(now) < SEND_AT_MINUTE) return false;
  const today = salonDateKey(now);
  const tomorrow = addDaysToKey(today, 1);
  const dayStart = salonTimeToUtc(today, 0);
  const tomorrowStart = salonTimeToUtc(tomorrow, 0);
  const tomorrowEnd = salonTimeToUtc(addDaysToKey(tomorrow, 1), 0);

  const [todays, needsUpdate, tomorrows] = await Promise.all([
    prisma.booking.findMany({
      where: { paymentStatus: { in: [...ACTIVE] }, appointmentAt: { gte: dayStart, lt: tomorrowStart } },
      include: { service: true },
      orderBy: { appointmentAt: "asc" },
    }),
    prisma.booking.findMany({
      where: { paymentStatus: { in: [...ACTIVE] }, outcome: null, endAt: { lte: now } },
      include: { service: true },
      orderBy: { appointmentAt: "asc" },
      take: 50,
    }),
    prisma.booking.count({ where: { paymentStatus: { in: [...ACTIVE] }, appointmentAt: { gte: tomorrowStart, lt: tomorrowEnd } } }),
  ]);
  if (!todays.length && !needsUpdate.length && !tomorrows) return false; // nothing worth a message
  if (!(await claimToday(today))) return false;

  const owing = needsUpdate.filter((b) => balanceOf(b) > 0);
  const owingTotal = owing.reduce((s, b) => s + balanceOf(b), 0);
  const base = siteBase();
  const statusOf = (b: (typeof todays)[number]) =>
    b.outcome === "COMPLETED" ? "✓ Completed" : b.outcome === "NO_SHOW" ? "No-show" : b.endAt <= now ? "Needs update" : "Upcoming";

  const html = renderEmail({
    preheader: `${todays.length} appointment${todays.length === 1 ? "" : "s"} today · ${needsUpdate.length} need updating · ${tomorrows} tomorrow`,
    eyebrow: "Daily summary",
    title: `Your day — ${formatSalonDate(now).replace(/, \d{4}$/, "")}`,
    intro: needsUpdate.length
      ? `<strong>${needsUpdate.length} appointment${needsUpdate.length === 1 ? " needs" : "s need"} updating.</strong> Did they come? Was the balance paid? Mark each one so your records and balances stay right.`
      : "Everything is up to date — nice work.",
    rows: [
      { label: "Appointments today", value: String(todays.length) },
      { label: "Need updating", value: String(needsUpdate.length), strong: needsUpdate.length > 0 },
      ...(owingTotal ? [{ label: "Balances not yet recorded", value: formatUSD(owingTotal), strong: true }] : []),
      { label: "Appointments tomorrow", value: String(tomorrows) },
    ],
    sections: [
      ...(needsUpdate.length
        ? [
            {
              title: "Needs updating",
              items: needsUpdate.map(
                (b) => `${formatSalonDate(b.appointmentAt).replace(/, \d{4}$/, "")} ${short(b.appointmentAt)} — ${b.clientName}, ${b.service.name}${balanceOf(b) ? ` (owes ${formatUSD(balanceOf(b))})` : ""}`,
              ),
            },
          ]
        : []),
      ...(todays.length ? [{ title: "Today", items: todays.map((b) => `${short(b.appointmentAt)} — ${b.clientName}, ${b.service.name} · ${statusOf(b)}`) }] : []),
    ],
    buttons: [
      ...(needsUpdate.length ? [{ label: `Update ${needsUpdate.length} appointment${needsUpdate.length === 1 ? "" : "s"}`, href: `${base}/manage?tab=review`, primary: true }] : []),
      { label: "Open Manage Bookings", href: `${base}/manage`, primary: !needsUpdate.length },
    ],
    note: `Not marked within 7 days, an appointment with a balance owing is labelled <em>Not updated</em> — you can still change it any time. ${esc("Appointments paid in full are marked Completed automatically after 24 hours.")}`,
    signoff: false,
  });
  const text = [
    `Daily summary — ${formatSalonDate(now)}`,
    `Today: ${todays.length} · Need updating: ${needsUpdate.length}${owingTotal ? ` (${formatUSD(owingTotal)} not recorded)` : ""} · Tomorrow: ${tomorrows}`,
    ...needsUpdate.map((b) => `- ${formatSalonDate(b.appointmentAt)} ${short(b.appointmentAt)} ${b.clientName}${balanceOf(b) ? ` owes ${formatUSD(balanceOf(b))}` : ""}`),
    `Update: ${base}/manage?tab=review`,
  ].join("\n");

  const whatsapp = [
    `📋 *Daily summary* — ${formatSalonDate(now).replace(/, \d{4}$/, "")}`,
    `📅 Today: ${todays.length} · Tomorrow: ${tomorrows}`,
    needsUpdate.length ? `⚠️ *${needsUpdate.length} need updating*${owingTotal ? ` · ${formatUSD(owingTotal)} not recorded` : ""}` : "✅ Everything is up to date",
    ...needsUpdate.slice(0, 5).map((b) => `• ${b.clientName} (${formatSalonDate(b.appointmentAt).split(",")[1]?.trim()})`),
    ...(needsUpdate.length > 5 ? [`…and ${needsUpdate.length - 5} more`] : []),
    `🔗 ${base}/manage?tab=review`,
  ].join("\n");

  const to = adminEmails().join(", ");
  const results = await Promise.allSettled([
    to ? sendEmail(to, `📋 Daily summary — ${needsUpdate.length ? `${needsUpdate.length} need updating` : "all up to date"}`, html, text) : Promise.resolve("skipped"),
    sendWhatsAppAlert(whatsapp),
  ]);
  for (const r of results) if (r.status === "rejected") console.error("[summary] delivery failed", r.reason);
  return true;
}
