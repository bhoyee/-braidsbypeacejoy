import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { salonDateKey, salonTimeToUtc, formatUSD } from "./time";
import { notifyBookingCancelled, notifyManualPayment } from "./notifications";
import { prisma } from "./prisma";
import { stripe } from "./stripe";

// Owner booking management (/manage). Every function here assumes the caller has
// already checked requireAdmin().

export const MANAGE_TABS = [
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
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

export async function listBookings(tab: ManageTab, q: string, page: number) {
  const where: Prisma.BookingWhereInput = { AND: [tabWhere(tab), searchWhere(q)] };
  const order: Prisma.BookingOrderByWithRelationInput =
    tab === "upcoming" || tab === "today" ? { appointmentAt: "asc" } : tab === "cancelled" ? { cancelledAt: "desc" } : { appointmentAt: "desc" };
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
      activity: { orderBy: { createdAt: "desc" }, take: 30 },
    },
  });
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
  if (b.outcome) return { ok: false, error: "This appointment is already marked as completed or no-show." };

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
