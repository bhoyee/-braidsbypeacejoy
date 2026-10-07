import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { CLOSE_MINUTE, OPEN_MINUTE, SLOT_STEP_MIN } from "./config";
import { findConflict, findTimeOff, getDaySlots } from "./availability";
import { withSchedulerLock } from "./booking";
import { formatSalonDate, formatSalonTime, salonDateKey, salonMinuteOfDay, salonTimeToUtc, formatUSD } from "./time";
import { notifyBookingCancelled, notifyBookingRescheduled, notifyManualPayment } from "./notifications";
import { prisma } from "./prisma";
import { stripe } from "./stripe";

// Owner booking management (/manage). Every function here assumes the caller has
// already checked requireAdmin().

export const MANAGE_TABS = [
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "review", label: "Needs update" },
  { id: "past", label: "Past" },
  { id: "cancelled", label: "Cancelled" },
] as const;
export type ManageTab = (typeof MANAGE_TABS)[number]["id"];

export const PAYMENT_METHODS = [
  { id: "CASHAPP", label: "Cash App" },
  { id: "ZELLE", label: "Zelle" },
  { id: "CASH", label: "Cash" },
] as const;

const ACTIVE = ["DEPOSIT_PAID", "FULLY_SETTLED"] as const;
const PAGE = 20;

function tabWhere(tab: ManageTab, now = new Date()): Prisma.BookingWhereInput {
  const today = salonDateKey(now);
  const dayStart = salonTimeToUtc(today, 0);
  const dayEnd = salonTimeToUtc(today, 24 * 60);
  switch (tab) {
    case "today":
      return { paymentStatus: { in: [...ACTIVE] }, appointmentAt: { gte: dayStart, lt: dayEnd } };
    case "upcoming":
      return { paymentStatus: { in: [...ACTIVE] }, appointmentAt: { gte: now } };
    case "review":
      // Appointment time has passed but not yet marked completed / no-show.
      return { paymentStatus: { in: [...ACTIVE] }, appointmentAt: { lt: now }, outcome: null };
    case "past":
      return { paymentStatus: { in: [...ACTIVE] }, appointmentAt: { lt: now } };
    case "cancelled":
      return { paymentStatus: { in: ["CANCELLED", "REFUNDED"] } };
  }
}

function searchWhere(q: string): Prisma.BookingWhereInput {
  const term = q.trim();
  if (!term) return {};
  const digits = term.replace(/\D/g, "");
  return {
    OR: [
      { clientName: { contains: term } },
      { clientEmail: { contains: term.toLowerCase() } },
      { bookingCode: { contains: term.toUpperCase() } },
      ...(digits.length >= 4 ? [{ clientPhone: { contains: digits.slice(-4) } }] : []),
    ],
  };
}

/** Every booking (confirmed or cancelled) on one salon-local day, e.g. "2026-10-06". */
function dayWhere(date: string): Prisma.BookingWhereInput {
  return {
    paymentStatus: { in: [...ACTIVE, "CANCELLED", "REFUNDED"] },
    appointmentAt: { gte: salonTimeToUtc(date, 0), lt: salonTimeToUtc(date, 24 * 60) },
  };
}

export const isDateKey = (v: string | undefined): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

export async function listBookings(tab: ManageTab, q: string, page: number, date?: string) {
  const where: Prisma.BookingWhereInput = { AND: [date ? dayWhere(date) : tabWhere(tab), searchWhere(q)] };
  const order: Prisma.BookingOrderByWithRelationInput =
    date || tab === "upcoming" || tab === "today" ? { appointmentAt: "asc" } : tab === "cancelled" ? { cancelledAt: "desc" } : { appointmentAt: "desc" };
  const [total, items, counts] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({ where, orderBy: order, skip: (page - 1) * PAGE, take: PAGE, include: { service: true } }),
    Promise.all(MANAGE_TABS.map((t) => prisma.booking.count({ where: tabWhere(t.id) }))),
  ]);
  return {
    items,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE)),
    counts: Object.fromEntries(MANAGE_TABS.map((t, i) => [t.id, counts[i]])) as Record<ManageTab, number>,
  };
}

export async function getBooking(id: string) {
  return prisma.booking.findUnique({
    where: { id },
    include: {
      service: true,
      payments: { where: { status: { in: ["PAID", "REFUNDED"] } }, orderBy: { createdAt: "asc" } },
    },
  });
}

export const ACTIVITY_PAGE = 10;

/** A booking's activity log (newest first), one page at a time. */
export async function bookingActivity(bookingId: string, page = 1) {
  const total = await prisma.activityLog.count({ where: { bookingId } });
  const pageCount = Math.max(1, Math.ceil(total / ACTIVITY_PAGE));
  const current = Math.min(Math.max(1, page), pageCount);
  const items = await prisma.activityLog.findMany({
    where: { bookingId },
    orderBy: { createdAt: "desc" },
    skip: (current - 1) * ACTIVITY_PAGE,
    take: ACTIVITY_PAGE,
  });
  return { items, total, page: current, pageCount };
}

async function log(bookingId: string, action: string, detail?: string) {
  await prisma.activityLog.create({ data: { bookingId, action, detail } });
}

type Result = { ok: true; message: string } | { ok: false; error: string };

/** Cancel: frees the slot. Optionally refunds the Stripe deposit. Emails the client. */
export async function cancelBooking(id: string, reason: string, refundDeposit: boolean): Promise<Result> {
  const b = await prisma.booking.findUnique({ where: { id }, include: { service: true, payments: true } });
  if (!b) return { ok: false, error: "Booking not found." };
  if (!ACTIVE.includes(b.paymentStatus as (typeof ACTIVE)[number])) return { ok: false, error: "Only confirmed bookings can be cancelled." };
  if (b.outcome && b.outcome !== "NOT_UPDATED") return { ok: false, error: "This appointment is already marked as completed or no-show." };

  let refunded = false;
  if (refundDeposit) {
    const deposit = b.payments.find((p) => p.kind === "DEPOSIT" && p.status === "PAID" && p.method === "STRIPE" && p.stripePaymentIntentId);
    if (!deposit) return { ok: false, error: "There's no online deposit payment to refund. Refund it manually if it was paid another way." };
    try {
      await stripe().refunds.create({ payment_intent: deposit.stripePaymentIntentId!, amount: deposit.amountCents }, { idempotencyKey: `owner_refund_${deposit.id}` });
    } catch (err) {
      console.error("[manage] refund failed", err);
      return { ok: false, error: "Stripe couldn't refund the deposit, so the booking was NOT cancelled. Try again, or refund it in your Stripe dashboard." };
    }
    await prisma.payment.update({ where: { id: deposit.id }, data: { status: "REFUNDED" } });
    refunded = true;
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { paymentStatus: "CANCELLED", cancelledAt: new Date(), cancelReason: reason.trim() || null, depositRefunded: refunded, holdExpiresAt: null },
    include: { service: true },
  });
  await log(id, "Cancelled", `${refunded ? "Deposit refunded" : "Deposit kept"}${reason.trim() ? ` — ${reason.trim()}` : ""}`);
  await notifyBookingCancelled(updated, { refunded, reason: reason.trim() }).catch((e) => console.error("[notify]", e));
  return { ok: true, message: `Booking cancelled${refunded ? " and deposit refunded" : ""}. The client has been emailed.` };
}

/** Record a Cash App / Zelle / cash payment. Emails the client a receipt. */
export async function recordPayment(id: string, amountCents: number, method: string, note: string): Promise<Result> {
  if (!PAYMENT_METHODS.some((m) => m.id === method)) return { ok: false, error: "Choose how it was paid." };
  if (!Number.isInteger(amountCents) || amountCents <= 0) return { ok: false, error: "Enter an amount greater than $0." };
  const b = await prisma.booking.findUnique({ where: { id } });
  if (!b) return { ok: false, error: "Booking not found." };
  if (!ACTIVE.includes(b.paymentStatus as (typeof ACTIVE)[number])) return { ok: false, error: "Payments can only be recorded on confirmed bookings." };
  const balance = b.totalCents - b.amountPaidCents;
  if (amountCents > balance) return { ok: false, error: `That's more than the balance (${formatUSD(balance)}).` };

  const paid = b.amountPaidCents + amountCents;
  const [, updated] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        bookingId: id,
        kind: "BALANCE",
        amountCents,
        status: "PAID",
        method,
        note: note.trim() || null,
        stripeSessionId: `manual_${randomUUID()}`,
        paidAt: new Date(),
      },
    }),
    prisma.booking.update({
      where: { id },
      data: { amountPaidCents: paid, paymentStatus: paid >= b.totalCents ? "FULLY_SETTLED" : "DEPOSIT_PAID" },
      include: { service: true },
    }),
  ]);
  const label = PAYMENT_METHODS.find((m) => m.id === method)!.label;
  await log(id, "Payment recorded", `${formatUSD(amountCents)} by ${label}${note.trim() ? ` — ${note.trim()}` : ""}`);
  await notifyManualPayment(updated, amountCents, label).catch((e) => console.error("[notify]", e));
  return { ok: true, message: `${formatUSD(amountCents)} by ${label} recorded. The client has been emailed a receipt.` };
}

/** Completed / no-show (only once the appointment has started). No-shows are never refunded. */
export async function setOutcome(id: string, outcome: "COMPLETED" | "NO_SHOW" | null): Promise<Result> {
  const b = await prisma.booking.findUnique({ where: { id } });
  if (!b) return { ok: false, error: "Booking not found." };
  if (!ACTIVE.includes(b.paymentStatus as (typeof ACTIVE)[number])) return { ok: false, error: "Only confirmed bookings can be updated." };
  if (outcome && b.appointmentAt > new Date()) return { ok: false, error: "You can mark this once the appointment time has passed." };
  await prisma.booking.update({ where: { id }, data: { outcome } });
  await log(id, outcome === "NO_SHOW" ? "Marked no-show" : outcome === "COMPLETED" ? "Marked completed" : "Outcome cleared", outcome === "NO_SHOW" ? "Deposit kept (no refund for no-shows)" : undefined);
  return { ok: true, message: outcome === "NO_SHOW" ? "Marked as no-show — the deposit is kept." : outcome ? "Marked as completed." : "Cleared." };
}

export async function saveNotes(id: string, notes: string): Promise<Result> {
  const text = notes.trim().slice(0, 2000);
  await prisma.booking.update({ where: { id }, data: { ownerNotes: text || null } });
  await log(id, "Private notes updated");
  return { ok: true, message: "Notes saved." };
}

/* ------------------------------------------------------------------ */
/* Reschedule                                                          */
/* ------------------------------------------------------------------ */

/** Open start times on a day for moving this booking (its own current time counts as free). */
export async function rescheduleSlots(id: string, dateKey: string) {
  const b = await prisma.booking.findUnique({ where: { id }, include: { service: true } });
  if (!b || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return [];
  return getDaySlots(dateKey, b.service.durationMin, { excludeBookingId: id, minLeadMinutes: 0 });
}

/**
 * Move a confirmed booking to a new start time. Same rules as client bookings
 * (opening hours, finish by 7 PM, no overlaps — checked under the scheduler lock),
 * except the owner may choose any future time. Reminders are re-armed for the new time.
 */
export async function rescheduleBooking(id: string, startsAt: string, emailClient: boolean): Promise<Result> {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return { ok: false, error: "Choose a new date and time." };

  const before = await prisma.booking.findUnique({ where: { id }, include: { service: true } });
  if (!before) return { ok: false, error: "Booking not found." };
  if (!ACTIVE.includes(before.paymentStatus as (typeof ACTIVE)[number])) return { ok: false, error: "Only confirmed bookings can be rescheduled." };
  if (before.outcome && before.outcome !== "NOT_UPDATED") return { ok: false, error: "This appointment is already marked as completed or no-show." };
  if (start.getTime() === before.appointmentAt.getTime()) return { ok: false, error: "That's the current time — choose a different one." };

  const minute = salonMinuteOfDay(start);
  const duration = before.service.durationMin;
  if (start.getTime() % (SLOT_STEP_MIN * 60_000) !== 0) return { ok: false, error: "Invalid start time." };
  if (start.getTime() <= Date.now()) return { ok: false, error: "That time has already passed." };
  if (minute < OPEN_MINUTE || minute + duration > CLOSE_MINUTE)
    return { ok: false, error: `${before.service.name} must start at 8:00 AM or later and finish by 7:00 PM.` };

  const end = new Date(start.getTime() + duration * 60_000);
  const updated = await withSchedulerLock(async (tx) => {
    if ((await findConflict(tx, start, end, id)) || (await findTimeOff(tx, start, end))) return null;
    return tx.booking.update({
      where: { id },
      // New time → the 24-hour and 2-hour reminders go out again for it.
      data: { appointmentAt: start, endAt: end, outcome: null, dayBeforeReminderSentAt: null, reminderSentAt: null },
      include: { service: true },
    });
  });
  if (!updated) return { ok: false, error: "That time overlaps another booking or your time off — choose another time." };

  const from = `${formatSalonDate(before.appointmentAt)} at ${formatSalonTime(before.appointmentAt)}`;
  const to = `${formatSalonDate(start)} at ${formatSalonTime(start)}`;
  await log(id, "Rescheduled", `${from} → ${to}${emailClient ? " · client emailed" : " · client not emailed"}`);
  if (emailClient) await notifyBookingRescheduled(updated, before.appointmentAt).catch((e) => console.error("[notify]", e));
  return { ok: true, message: `Moved to ${to}.${emailClient ? " The client has been emailed." : ""}` };
}

/* ------------------------------------------------------------------ */
/* Time off                                                            */
/* ------------------------------------------------------------------ */

export type TimeOffInput =
  | { kind: "day"; date: string }
  | { kind: "range"; from: string; to: string }
  | { kind: "part"; date: string; fromMin: number; toMin: number }
  | { kind: "rest-of-today" };

const dateOk = (k: string) => /^\d{4}-\d{2}-\d{2}$/.test(k) && !Number.isNaN(Date.parse(k));

/** Turn the owner's choice into a UTC [start, end) range, or an error. */
function timeOffRange(input: TimeOffInput, now = new Date()): { start: Date; end: Date } | { error: string } {
  const today = salonDateKey(now);
  switch (input.kind) {
    case "day":
      if (!dateOk(input.date)) return { error: "Choose a date." };
      if (input.date < today) return { error: "That date has passed." };
      return { start: salonTimeToUtc(input.date, 0), end: salonTimeToUtc(input.date, 24 * 60) };
    case "range": {
      if (!dateOk(input.from) || !dateOk(input.to)) return { error: "Choose both dates." };
      if (input.to < input.from) return { error: "The end date is before the start date." };
      if (input.to < today) return { error: "Those dates have passed." };
      const days = (Date.parse(input.to) - Date.parse(input.from)) / 86_400_000;
      if (days > 366) return { error: "Choose a range of up to a year." };
      return { start: salonTimeToUtc(input.from, 0), end: salonTimeToUtc(input.to, 24 * 60) };
    }
    case "part": {
      if (!dateOk(input.date)) return { error: "Choose a date." };
      const { fromMin, toMin } = input;
      if (!(fromMin >= OPEN_MINUTE && toMin <= CLOSE_MINUTE && toMin > fromMin && fromMin % SLOT_STEP_MIN === 0 && toMin % SLOT_STEP_MIN === 0))
        return { error: "Choose a start and end time between 8:00 AM and 7:00 PM." };
      const end = salonTimeToUtc(input.date, toMin);
      if (end <= now) return { error: "That time has passed." };
      return { start: salonTimeToUtc(input.date, fromMin), end };
    }
    case "rest-of-today": {
      const step = SLOT_STEP_MIN * 60_000;
      const start = new Date(Math.floor(now.getTime() / step) * step);
      const end = salonTimeToUtc(today, CLOSE_MINUTE);
      if (end <= start) return { error: "The salon is already closed for today." };
      return { start, end };
    }
  }
}

/** Confirmed bookings that fall inside a time range (shown as a warning; never cancelled automatically). */
export async function bookingsDuring(start: Date, end: Date) {
  return prisma.booking.findMany({
    where: { paymentStatus: { in: [...ACTIVE] }, appointmentAt: { lt: end }, endAt: { gt: start } },
    select: { id: true, clientName: true, appointmentAt: true, service: { select: { name: true } } },
    orderBy: { appointmentAt: "asc" },
  });
}

export async function addTimeOff(input: TimeOffInput, note: string) {
  const r = timeOffRange(input);
  if ("error" in r) return { ok: false as const, error: r.error };
  await prisma.timeBlock.create({ data: { startAt: r.start, endAt: r.end, note: note.trim().slice(0, 120) || null } });
  const clashes = await bookingsDuring(r.start, r.end);
  return { ok: true as const, clashes, label: describeTimeOff(r.start, r.end) };
}

export async function removeTimeOff(id: string) {
  await prisma.timeBlock.deleteMany({ where: { id } });
}

/** Upcoming time off (not yet over), soonest first, each with any bookings inside it. */
export async function listTimeOff(now = new Date()) {
  const blocks = await prisma.timeBlock.findMany({ where: { endAt: { gt: now } }, orderBy: { startAt: "asc" }, take: 100 });
  return Promise.all(blocks.map(async (b) => ({ ...b, label: describeTimeOff(b.startAt, b.endAt), clashes: await bookingsDuring(b.startAt, b.endAt) })));
}

/** "Thu, Oct 15 · 1:00 PM – 4:00 PM" or "Mon, Dec 24 – Thu, Jan 2 · all day" (salon time). */
export function describeTimeOff(start: Date, end: Date) {
  const day = (d: Date) => formatSalonDate(d).replace(/^(\w{3})\w*, (\w{3})\w* (\d+), (\d{4})$/, "$1, $2 $3");
  const t = (d: Date) => formatSalonTime(d).replace(/ E[DS]T$/, "");
  const startsAtMidnight = salonMinuteOfDay(start) === 0;
  const endsAtMidnight = salonMinuteOfDay(end) === 0;
  if (startsAtMidnight && endsAtMidnight) {
    const lastDay = new Date(end.getTime() - 60_000);
    return salonDateKey(start) === salonDateKey(lastDay) ? `${day(start)} · all day` : `${day(start)} – ${day(lastDay)} · all day`;
  }
  return `${day(start)} · ${t(start)} – ${t(end)}`;
}
