import "server-only";
import type { Prisma } from "@prisma/client";
import {
  CLOSE_MINUTE,
  MAX_DAYS_AHEAD,
  MIN_LEAD_MINUTES,
  OPEN_MINUTE,
  SLOT_STEP_MIN,
} from "./config";
import { prisma } from "./prisma";
import { addDaysToKey, minuteLabel, salonDateKey, salonMinuteOfDay, salonTimeToUtc } from "./time";

export type SlotStatus = "available" | "booked" | "unavailable" | "after-hours" | "past";

export type Slot = {
  time: string; // "08:30"
  label: string; // "8:30 AM"
  startsAt: string; // ISO UTC
  status: SlotStatus;
};

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * Bookings that block the calendar: paid ones (DEPOSIT_PAID / FULLY_SETTLED)
 * plus short-lived holds for clients currently on Stripe Checkout, so two people
 * can never pay for the same slot at the same time.
 */
export function blockingWhere(now = new Date()): Prisma.BookingWhereInput {
  return {
    OR: [
      { paymentStatus: { in: ["DEPOSIT_PAID", "FULLY_SETTLED"] } },
      { paymentStatus: "PENDING_DEPOSIT", holdExpiresAt: { gt: now } },
    ],
  };
}

export async function findConflict(db: Db, start: Date, end: Date, excludeBookingId?: string) {
  return db.booking.findFirst({
    where: {
      AND: [
        blockingWhere(),
        { appointmentAt: { lt: end } },
        { endAt: { gt: start } },
        excludeBookingId ? { id: { not: excludeBookingId } } : {},
      ],
    },
    select: { id: true },
  });
}

/** Owner time off overlapping [start, end) — clients can't book inside it. */
export async function findTimeOff(db: Db, start: Date, end: Date) {
  return db.timeBlock.findFirst({ where: { startAt: { lt: end }, endAt: { gt: start } }, select: { id: true } });
}

/**
 * Salon dates in [fromKey, toKey] that are completely closed by time off
 * (every minute from opening to closing is blocked) — greyed out in the booking calendar.
 */
export async function closedDays(fromKey: string, toKey: string): Promise<string[]> {
  const blocks = await prisma.timeBlock.findMany({
    where: { startAt: { lt: salonTimeToUtc(addDaysToKey(toKey, 1), 0) }, endAt: { gt: salonTimeToUtc(fromKey, 0) } },
    select: { startAt: true, endAt: true },
    orderBy: { startAt: "asc" },
  });
  if (!blocks.length) return [];
  const closed: string[] = [];
  for (let day = fromKey; day <= toKey; day = addDaysToKey(day, 1)) {
    let covered = salonTimeToUtc(day, OPEN_MINUTE).getTime();
    const close = salonTimeToUtc(day, CLOSE_MINUTE).getTime();
    for (const b of blocks) {
      if (b.startAt.getTime() <= covered && b.endAt.getTime() > covered) covered = b.endAt.getTime();
      if (covered >= close) break;
    }
    if (covered >= close) closed.push(day);
  }
  return closed;
}

export function bookingWindow(now = new Date()) {
  const today = salonDateKey(now);
  return { firstDay: today, lastDay: addDaysToKey(today, MAX_DAYS_AHEAD) };
}

/** Validates a requested start time against the salon's operating rules. */
export function validateStart(start: Date, durationMin: number, now = new Date()): string | null {
  const minute = salonMinuteOfDay(start);
  const dateKey = salonDateKey(start);
  const { lastDay } = bookingWindow(now);
  if (start.getTime() % (SLOT_STEP_MIN * 60_000) !== 0) return "Invalid start time.";
  if (minute < OPEN_MINUTE) return "The salon opens at 8:00 AM.";
  if (minute + durationMin > CLOSE_MINUTE) return "This style must finish by 7:00 PM — please choose an earlier time.";
  if (start.getTime() < now.getTime() + MIN_LEAD_MINUTES * 60_000) return "That time is too soon or in the past.";
  if (dateKey > lastDay) return "That date is beyond our booking window.";
  return null;
}

/**
 * Every half-hour start time inside operating hours for a given salon date.
 * Options (owner rescheduling): ignore one booking's own time, and a different
 * minimum lead time (clients must book 2 hours ahead; the owner can use any future time).
 */
export async function getDaySlots(
  dateKey: string,
  durationMin: number,
  opts: { excludeBookingId?: string; minLeadMinutes?: number } = {},
): Promise<Slot[]> {
  const now = new Date();
  const lead = opts.minLeadMinutes ?? MIN_LEAD_MINUTES;
  const dayStart = salonTimeToUtc(dateKey, OPEN_MINUTE);
  const dayEnd = salonTimeToUtc(dateKey, CLOSE_MINUTE);

  const blocks = await prisma.timeBlock.findMany({
    where: { startAt: { lt: dayEnd }, endAt: { gt: dayStart } },
    select: { startAt: true, endAt: true },
  });
  const busy = await prisma.booking.findMany({
    where: {
      AND: [
        blockingWhere(now),
        { appointmentAt: { lt: dayEnd } },
        { endAt: { gt: dayStart } },
        opts.excludeBookingId ? { id: { not: opts.excludeBookingId } } : {},
      ],
    },
    select: { appointmentAt: true, endAt: true },
  });

  const slots: Slot[] = [];
  for (let m = OPEN_MINUTE; m < CLOSE_MINUTE; m += SLOT_STEP_MIN) {
    const start = salonTimeToUtc(dateKey, m);
    const end = new Date(start.getTime() + durationMin * 60_000);
    let status: SlotStatus = "available";
    if (start.getTime() < now.getTime() + lead * 60_000) status = "past";
    else if (m + durationMin > CLOSE_MINUTE) status = "after-hours";
    else if (blocks.some((b) => b.startAt < end && b.endAt > start)) status = "unavailable";
    else if (busy.some((b) => b.appointmentAt < end && b.endAt > start)) status = "booked";

    slots.push({
      time: `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`,
      label: minuteLabel(m),
      startsAt: start.toISOString(),
      status,
    });
  }
  return slots;
}
