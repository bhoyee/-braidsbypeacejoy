import "server-only";
import { VISIT_WHERE } from "./clients";
import { notifyRetention, notifyReviewRequest } from "./notifications";
import { prisma } from "./prisma";
import { salonMinuteOfDay } from "./time";
import { usPhoneDigits } from "./phone";

// Follow-up emails, run from the every-minute cron route. Each send is claimed
// atomically first, so overlapping runs never email anyone twice.

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/**
 * "Come back" emails: days after the last visit for each of the 3 emails
 * (default 2, 3 and 4 months). Set RETENTION_STEPS="60,90,120" in .env to change.
 */
export const RETENTION_STEPS = (() => {
  const days = (process.env.RETENTION_STEPS ?? "").split(",").map((d) => Number(d.trim())).filter((d) => d > 0);
  return days.length === 3 ? days.sort((a, b) => a - b) : [60, 90, 120];
})();
const STALE_DAYS = 7; // unmarked deposit-only appointments → "Not updated"
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
 * Appointments the owner never marked:
 * - PAID IN FULL → treated as Completed 24 hours after they end (they almost certainly came);
 * - balance still owing → left in "Needs update" (the daily summary reminds the owner),
 *   then labelled "Not updated" after 7 days so lists stay tidy. That label is neutral:
 *   no review email, and the owner can still change it to Completed or No-show.
 */
export async function autoCompleteVisits(now = new Date()) {
  const due = await prisma.booking.findMany({
    where: { paymentStatus: "FULLY_SETTLED", outcome: null, endAt: { lte: new Date(now.getTime() - DAY) } },
    select: { id: true },
    take: 100,
  });
  let done = 0;
  for (const { id } of due) {
    const claim = await prisma.booking.updateMany({ where: { id, outcome: null, paymentStatus: "FULLY_SETTLED" }, data: { outcome: "COMPLETED" } });
    if (claim.count !== 1) continue; // the owner (or another run) just marked it
    await prisma.activityLog.create({
      data: { bookingId: id, action: "Marked completed automatically", detail: "Paid in full and not marked within 24 hours — change to No-show if they didn't come" },
    });
    done++;
  }

  const stale = await prisma.booking.findMany({
    where: { paymentStatus: "DEPOSIT_PAID", outcome: null, endAt: { lte: new Date(now.getTime() - STALE_DAYS * DAY) } },
    select: { id: true },
    take: 100,
  });
  for (const { id } of stale) {
    const claim = await prisma.booking.updateMany({ where: { id, outcome: null, paymentStatus: "DEPOSIT_PAID" }, data: { outcome: "NOT_UPDATED" } });
    if (claim.count !== 1) continue;
    await prisma.activityLog.create({
      data: { bookingId: id, action: "Marked “Not updated”", detail: `Not marked within ${STALE_DAYS} days and the balance wasn't recorded — set Completed or No-show when you know` },
    });
    done++;
  }
  return done;
}

/**
 * Review request: once the visit is Completed (tapped by the owner, or automatically
 * 24 hours after it ends). Never for no-shows, cancellations, or visits that ended
 * more than a week ago.
 */
export async function sendReviewRequests(now = new Date()) {
  if (!civilHour(now)) return 0;
  const due = await prisma.booking.findMany({
    where: {
      paymentStatus: { in: ["DEPOSIT_PAID", "FULLY_SETTLED"] },
      reviewRequestSentAt: null,
      outcome: "COMPLETED",
      endAt: { gt: new Date(now.getTime() - 7 * DAY), lte: now },
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
 * "Come back" sequence: up to 3 emails (RETENTION_STEPS, default 2, 3 and 4 months
 * after the last visit). It stops as soon as the client books again with the same
 * email OR the same phone number, or unsubscribes. A new visit starts a fresh sequence.
 */
export async function sendRetentionReminders(now = new Date()) {
  if (!civilHour(now)) return 0;
  const [first, , last] = RETENTION_STEPS;
  const newest = new Date(now.getTime() - first * DAY);
  const oldest = new Date(now.getTime() - (last + 30) * DAY); // older history never gets a burst

  // Latest visit per email — future bookings included, so anyone already rebooked drops out.
  const latest = await prisma.booking.groupBy({
    by: ["clientEmail"],
    where: VISIT_WHERE,
    _max: { appointmentAt: true },
    having: { appointmentAt: { _max: { lte: newest, gt: oldest } } },
  });
  if (!latest.length) return 0;

  // Latest visit per phone number, to catch clients who rebooked under another email.
  const recent = await prisma.booking.findMany({
    where: { AND: [VISIT_WHERE, { appointmentAt: { gt: oldest } }] },
    select: { clientPhone: true, appointmentAt: true },
  });
  const latestByPhone = new Map<string, Date>();
  for (const r of recent) {
    const d = usPhoneDigits(r.clientPhone);
    if (!latestByPhone.has(d) || latestByPhone.get(d)! < r.appointmentAt) latestByPhone.set(d, r.appointmentAt);
  }

  const contacts = await prisma.emailContact.findMany({ where: { email: { in: latest.map((l) => l.clientEmail) } } });
  const byEmail = new Map(contacts.map((c) => [c.email, c]));

  let sent = 0;
  for (const l of latest) {
    if (sent >= PER_RUN) break;
    const lastVisit = l._max.appointmentAt!;
    const contact = byEmail.get(l.clientEmail);
    if (contact?.unsubscribedAt) continue;

    // Which email is due: 1, 2 or 3 (the highest step whose day count has passed).
    const daysSince = (now.getTime() - lastVisit.getTime()) / DAY;
    const step = RETENTION_STEPS.filter((d) => daysSince >= d).length;
    const sameVisit = contact?.retentionVisitAt?.getTime() === lastVisit.getTime();
    const alreadySent = sameVisit ? contact!.retentionStep : 0;
    if (step <= alreadySent) continue;
    // Never two of these within 3 weeks (e.g. right after this feature first switches on).
    if (contact?.lastRetentionAt && contact.lastRetentionAt > new Date(now.getTime() - 21 * DAY)) continue;

    const booking = await prisma.booking.findFirst({
      where: { AND: [VISIT_WHERE, { clientEmail: l.clientEmail, appointmentAt: lastVisit }] },
      include: { service: true },
    });
    if (!booking) continue;
    const phoneLatest = latestByPhone.get(usPhoneDigits(booking.clientPhone));
    if (phoneLatest && phoneLatest > lastVisit) continue; // rebooked with a different email

    // Claim this step atomically so overlapping runs never double-send.
    await prisma.emailContact.upsert({ where: { email: l.clientEmail }, update: {}, create: { email: l.clientEmail } });
    const claim = await prisma.emailContact.updateMany({
      where: {
        email: l.clientEmail,
        unsubscribedAt: null,
        ...(sameVisit ? { retentionVisitAt: lastVisit, retentionStep: alreadySent } : { OR: [{ retentionVisitAt: null }, { retentionVisitAt: { not: lastVisit } }] }),
      },
      data: { retentionStep: step, retentionVisitAt: lastVisit, lastRetentionAt: now },
    });
    if (claim.count !== 1) continue;

    try {
      await notifyRetention(booking, step as 1 | 2 | 3, Math.round(RETENTION_STEPS[step - 1] / 30));
      await prisma.activityLog.create({
        data: { bookingId: booking.id, action: `Come-back email ${step} of 3 sent`, detail: `${Math.round(RETENTION_STEPS[step - 1] / 30)} months after this visit` },
      });
      sent++;
    } catch (err) {
      console.error("[followups] retention email failed", err);
    }
  }
  return sent;
}
