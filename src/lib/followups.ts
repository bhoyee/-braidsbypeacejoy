import "server-only";
import { VISIT_WHERE } from "./clients";
import { notifyRetention, notifyReviewRequest } from "./notifications";
import { prisma } from "./prisma";
import { salonMinuteOfDay } from "./time";

// Follow-up emails, run from the every-minute cron route. Each send is claimed
// atomically first, so overlapping runs never email anyone twice.

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Days after the last visit before the "time for a refresh?" email (default 90 ≈ 3 months). */
const RETENTION_DAYS = Number(process.env.RETENTION_DAYS) || 90;
const PER_RUN = 5; // gentle on the mail server

/** Only email clients at a civil hour, salon time (10 AM – 6 PM). */
const civilHour = (now: Date) => {
  const m = salonMinuteOfDay(now);
  return m >= 10 * 60 && m < 18 * 60;
};

async function unsubscribed(emails: string[]) {
  if (!emails.length) return new Set<string>();
  const rows = await prisma.emailContact.findMany({ where: { email: { in: emails }, unsubscribedAt: { not: null } }, select: { email: true } });
  return new Set(rows.map((r) => r.email));
}

/**
 * Review request: once the owner marks the visit Completed (next civil-hour run),
 * or 24 hours after the appointment ends if it was never marked. Never for no-shows,
 * cancellations, or appointments that ended more than a week ago.
 */
export async function sendReviewRequests(now = new Date()) {
  if (!civilHour(now)) return 0;
  const due = await prisma.booking.findMany({
    where: {
      paymentStatus: { in: ["DEPOSIT_PAID", "FULLY_SETTLED"] },
      reviewRequestSentAt: null,
      endAt: { gt: new Date(now.getTime() - 7 * DAY) },
      OR: [
        { outcome: "COMPLETED", endAt: { lte: now } },
        { outcome: null, endAt: { lte: new Date(now.getTime() - DAY) } },
      ],
    },
    include: { service: true },
    orderBy: { endAt: "asc" },
    take: PER_RUN,
  });
  const skip = await unsubscribed(due.map((b) => b.clientEmail));

  let sent = 0;
  for (const b of due) {
    const claim = await prisma.booking.updateMany({ where: { id: b.id, reviewRequestSentAt: null }, data: { reviewRequestSentAt: now } });
    if (claim.count !== 1 || skip.has(b.clientEmail)) continue;
    // A client with two bookings the same week only gets one review email.
    const recent = await prisma.booking.count({
      where: { clientEmail: b.clientEmail, id: { not: b.id }, reviewRequestSentAt: { gt: new Date(now.getTime() - 30 * DAY) } },
    });
    if (recent) continue;
    try {
      await notifyReviewRequest(b);
      await prisma.activityLog.create({ data: { bookingId: b.id, action: "Review request emailed", detail: "Google review + Instagram/TikTok" } });
      sent++;
    } catch (err) {
      console.error("[followups] review email failed", err);
    }
  }
  return sent;
}

/**
 * "Time for a refresh?": clients whose most recent visit was RETENTION_DAYS ago
 * (up to 30 days later, so old history never gets a burst of emails), with nothing
 * booked since, and not already reminded since that visit.
 */
export async function sendRetentionReminders(now = new Date()) {
  if (!civilHour(now)) return 0;
  const due = new Date(now.getTime() - RETENTION_DAYS * DAY);
  const oldest = new Date(due.getTime() - 30 * DAY);

  // Latest visit per client — includes future bookings, so anyone already rebooked drops out.
  const latest = await prisma.booking.groupBy({
    by: ["clientEmail"],
    where: VISIT_WHERE,
    _max: { appointmentAt: true },
    having: { appointmentAt: { _max: { lte: due, gt: oldest } } },
  });
  if (!latest.length) return 0;

  const contacts = await prisma.emailContact.findMany({ where: { email: { in: latest.map((l) => l.clientEmail) } } });
  const byEmail = new Map(contacts.map((c) => [c.email, c]));
  const candidates = latest
    .filter((l) => {
      const c = byEmail.get(l.clientEmail);
      return !c?.unsubscribedAt && !(c?.lastRetentionAt && c.lastRetentionAt > l._max.appointmentAt!);
    })
    .slice(0, PER_RUN);

  let sent = 0;
  for (const c of candidates) {
    const lastVisit = c._max.appointmentAt!;
    // Claim: create the contact row if needed, then stamp it only if not already stamped.
    await prisma.emailContact.upsert({ where: { email: c.clientEmail }, update: {}, create: { email: c.clientEmail } });
    const claim = await prisma.emailContact.updateMany({
      where: { email: c.clientEmail, unsubscribedAt: null, OR: [{ lastRetentionAt: null }, { lastRetentionAt: { lte: lastVisit } }] },
      data: { lastRetentionAt: now },
    });
    if (claim.count !== 1) continue;

    const booking = await prisma.booking.findFirst({
      where: { AND: [VISIT_WHERE, { clientEmail: c.clientEmail, appointmentAt: lastVisit }] },
      include: { service: true },
    });
    if (!booking) continue;
    try {
      await notifyRetention(booking);
      await prisma.activityLog.create({ data: { bookingId: booking.id, action: "3-month reminder emailed", detail: `“Time for a refresh?” — link to book ${booking.service.name} again` } });
      sent++;
    } catch (err) {
      console.error("[followups] retention email failed", err);
    }
  }
  return sent;
}
