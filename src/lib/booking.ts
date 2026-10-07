import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import { Prisma, type Booking, type Service } from "@prisma/client";
import type Stripe from "stripe";
import { findConflict, findTimeOff } from "./availability";
import { addOnsSummary, type AddOnQuote } from "./addons";
import { CHECKOUT_HOLD_MINUTES } from "./config";
import { formatUsPhone } from "./phone";
import { notifyBookingConfirmed, notifyAdminRefund } from "./notifications";
import { prisma } from "./prisma";
import { stripe } from "./stripe";

export type CheckoutSession = Awaited<ReturnType<Stripe["checkout"]["sessions"]["retrieve"]>>;
export type BookingWithService = Booking & { service: Service };

export class SlotTakenError extends Error {
  constructor() {
    super("Sorry — that time was just taken. Please choose another slot.");
  }
}

/** Run `fn` inside a transaction that holds the global scheduler row lock. */
export async function withSchedulerLock<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`INSERT IGNORE INTO scheduler_lock (id) VALUES (1)`;
      await tx.$queryRaw`SELECT id FROM scheduler_lock WHERE id = 1 FOR UPDATE`;
      return fn(tx);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 10_000, timeout: 20_000 },
  );
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
export function generateBookingCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `PJ-${s}`;
}

/**
 * Step 1 of checkout: atomically verify the slot is free and place a short hold
 * on it (PENDING_DEPOSIT) for exactly as long as the Stripe session lives.
 * The booking is NOT confirmed until Stripe proves the $30 was paid.
 */
export async function createDepositHold(input: {
  service: Service;
  start: Date;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes?: string;
  addOns?: { hair: string; bundles: number; colorMix: boolean; quote: AddOnQuote };
}) {
  const end = new Date(input.start.getTime() + input.service.durationMin * 60_000);
  const holdExpiresAt = new Date(Math.ceil(Date.now() / 1000 + CHECKOUT_HOLD_MINUTES * 60) * 1000);

  const booking = await withSchedulerLock(async (tx) => {
    if ((await findConflict(tx, input.start, end)) || (await findTimeOff(tx, input.start, end))) throw new SlotTakenError();
    return tx.booking.create({
      data: {
        bookingCode: generateBookingCode(),
        clientName: input.clientName,
        clientEmail: input.clientEmail.toLowerCase(),
        clientPhone: input.clientPhone,
        notes: input.notes || null,
        appointmentAt: input.start,
        endAt: end,
        serviceId: input.service.id,
        totalCents: input.service.priceCents + (input.addOns?.quote.totalCents ?? 0),
        addOnsCents: input.addOns?.quote.totalCents ?? 0,
        addOns: input.addOns
          ? {
              hair: input.addOns.hair,
              bundles: input.addOns.bundles,
              colorMix: input.addOns.colorMix,
              summary: input.addOns.quote.summary,
              lines: input.addOns.quote.lines,
            }
          : undefined,
        paymentStatus: "PENDING_DEPOSIT",
        // Placeholder until the Stripe session exists (column is unique + required).
        stripeSessionId: `pending_${randomUUID()}`,
        holdExpiresAt,
      },
    });
  });
  return { booking, holdExpiresAt };
}

/** Releases a hold immediately (session creation failed or client cancelled). */
export async function releaseHold(bookingId: string) {
  await prisma.booking.updateMany({
    where: { id: bookingId, paymentStatus: "PENDING_DEPOSIT" },
    data: { paymentStatus: "EXPIRED", holdExpiresAt: null },
  });
}

type ConfirmOutcome =
  | { state: "unpaid" }
  | { state: "unknown" }
  | { state: "confirmed"; booking: BookingWithService; kind: "DEPOSIT" | "BALANCE"; newlyPaid: boolean }
  | { state: "refunded"; booking: BookingWithService };

/**
 * Idempotently applies a paid Checkout Session to the database.
 * Called by BOTH the Stripe webhook and the success page's instant verification,
 * so whichever arrives first locks the slot and the other is a no-op.
 */
export async function confirmCheckoutSession(session: CheckoutSession): Promise<ConfirmOutcome> {
  if (session.payment_status !== "paid") return { state: "unpaid" };

  const paidCents = session.amount_total ?? 0;
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);

  const result = await withSchedulerLock(async (tx) => {
    let payment = await tx.payment.findUnique({ where: { stripeSessionId: session.id } });

    // Upsert path: the ledger row is missing (e.g. the API crashed between creating
    // the session and saving it). Rebuild it from the session metadata.
    if (!payment) {
      const bookingId = session.metadata?.bookingId;
      const kind = session.metadata?.kind === "BALANCE" ? "BALANCE" : "DEPOSIT";
      if (!bookingId || !(await tx.booking.findUnique({ where: { id: bookingId } }))) return null;
      payment = await tx.payment.create({
        data: { bookingId, kind, amountCents: paidCents, stripeSessionId: session.id },
      });
      if (kind === "DEPOSIT") {
        await tx.booking.update({ where: { id: bookingId }, data: { stripeSessionId: session.id } });
      }
    }

    const booking = await tx.booking.findUniqueOrThrow({
      where: { id: payment.bookingId },
      include: { service: true },
    });

    if (payment.status === "PAID") return { booking, kind: payment.kind, newlyPaid: false, refund: false };
    if (payment.status === "REFUNDED") return { booking, kind: payment.kind, newlyPaid: false, refund: true };

    const paymentUpdate = { paidAt: new Date(), stripePaymentIntentId: paymentIntentId };

    // Guard against paying for something that can no longer be honoured.
    const unbookable =
      payment.kind === "DEPOSIT"
        ? !["PENDING_DEPOSIT", "EXPIRED"].includes(booking.paymentStatus) ||
          !!(await findConflict(tx, booking.appointmentAt, booking.endAt, booking.id))
        : booking.paymentStatus !== "DEPOSIT_PAID";

    if (unbookable) {
      await tx.payment.update({ where: { id: payment.id }, data: { ...paymentUpdate, status: "REFUNDED" } });
      const updated =
        payment.kind === "DEPOSIT" && booking.paymentStatus !== "DEPOSIT_PAID" && booking.paymentStatus !== "FULLY_SETTLED"
          ? await tx.booking.update({
              where: { id: booking.id },
              data: { paymentStatus: "REFUNDED", holdExpiresAt: null },
              include: { service: true },
            })
          : booking;
      return { booking: updated, kind: payment.kind, newlyPaid: false, refund: true };
    }

    await tx.payment.update({ where: { id: payment.id }, data: { ...paymentUpdate, status: "PAID" } });
    const amountPaidCents = booking.amountPaidCents + paidCents;
    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: {
        amountPaidCents,
        paymentStatus: amountPaidCents >= booking.totalCents ? "FULLY_SETTLED" : "DEPOSIT_PAID",
        holdExpiresAt: null,
      },
      include: { service: true },
    });
    return { booking: updated, kind: payment.kind, newlyPaid: true, refund: false };
  });

  if (!result) return { state: "unknown" };

  if (result.refund) {
    if (paymentIntentId) {
      await stripe()
        .refunds.create({ payment_intent: paymentIntentId }, { idempotencyKey: `refund_${session.id}` })
        .catch((e) => console.error("[refund] failed", session.id, e));
    }
    await notifyAdminRefund(result.booking, paidCents).catch((e) => console.error("[notify]", e));
    return { state: "refunded", booking: result.booking };
  }

  if (result.newlyPaid) {
    // Fire-and-log: a failed email must never roll back a captured payment.
    await notifyBookingConfirmed(result.booking, result.kind, paidCents).catch((e) => console.error("[notify]", e));
  }
  return { state: "confirmed", booking: result.booking, kind: result.kind, newlyPaid: result.newlyPaid };
}

/** checkout.session.expired → release the slot hold / void the pending balance payment. */
export async function expireCheckoutSession(sessionId: string) {
  await prisma.$transaction([
    prisma.payment.updateMany({
      where: { stripeSessionId: sessionId, status: "PENDING" },
      data: { status: "EXPIRED" },
    }),
    prisma.booking.updateMany({
      where: { stripeSessionId: sessionId, paymentStatus: "PENDING_DEPOSIT" },
      data: { paymentStatus: "EXPIRED", holdExpiresAt: null },
    }),
  ]);
}

/** Turns user input into a Prisma filter: email address OR booking code. */
export function lookupFilter(q: string) {
  const query = q.trim();
  if (query.includes("@")) return { clientEmail: query.toLowerCase() };
  // A US phone number in any format → the (410) 555-0123 format bookings are stored in.
  const digits = query.replace(/\D/g, "");
  if (/^[\d\s()+.-]+$/.test(query) && (digits.length === 10 || (digits.length === 11 && digits.startsWith("1")))) {
    return { clientPhone: formatUsPhone(query) };
  }
  const code = query.toUpperCase().replace(/\s/g, "");
  return { bookingCode: code.startsWith("PJ-") ? code : `PJ-${code}` };
}

/** Client-safe view of a booking. */
export function toPublicBooking(b: BookingWithService) {
  return {
    id: b.id,
    bookingCode: b.bookingCode,
    firstName: b.clientName.split(" ")[0],
    serviceName: b.service.name,
    appointmentAt: b.appointmentAt.toISOString(),
    durationMin: b.service.durationMin,
    totalCents: b.totalCents,
    addOnsCents: b.addOnsCents,
    addOnsSummary: addOnsSummary(b),
    amountPaidCents: b.amountPaidCents,
    balanceCents: Math.max(0, b.totalCents - b.amountPaidCents),
    paymentStatus: b.paymentStatus,
  };
}
export type PublicBooking = ReturnType<typeof toPublicBooking>;
