import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { siteBase } from "./email-template";
import { prisma } from "./prisma";

// Clients are recognised by their email address (stored lower-cased on every booking).

/** A booking that counts as a visit: confirmed, and not a no-show. */
export const VISIT_WHERE: Prisma.BookingWhereInput = {
  paymentStatus: { in: ["DEPOSIT_PAID", "FULLY_SETTLED"] },
  OR: [{ outcome: null }, { outcome: "COMPLETED" }],
};

/** How many visits this client had before `before` (0 = new client). */
export async function priorVisits(email: string, before: Date, excludeId?: string) {
  return prisma.booking.count({
    where: { AND: [VISIT_WHERE, { clientEmail: email.toLowerCase(), appointmentAt: { lt: before } }, excludeId ? { id: { not: excludeId } } : {}] },
  });
}

/** Visit number for each booking in a list (1 = first visit), with one query. */
export async function visitNumbers(bookings: { id: string; clientEmail: string; appointmentAt: Date }[]) {
  const emails = [...new Set(bookings.map((b) => b.clientEmail))];
  if (!emails.length) return new Map<string, number>();
  const visits = await prisma.booking.findMany({
    where: { AND: [VISIT_WHERE, { clientEmail: { in: emails } }] },
    select: { id: true, clientEmail: true, appointmentAt: true },
  });
  return new Map(
    bookings.map((b) => [
      b.id,
      1 + visits.filter((v) => v.clientEmail === b.clientEmail && v.id !== b.id && v.appointmentAt < b.appointmentAt).length,
    ]),
  );
}

/** Every booking this client has made (newest first), for the owner's history view. */
export async function clientHistory(email: string) {
  return prisma.booking.findMany({
    where: { clientEmail: email.toLowerCase(), paymentStatus: { in: ["DEPOSIT_PAID", "FULLY_SETTLED", "CANCELLED", "REFUNDED"] } },
    orderBy: { appointmentAt: "desc" },
    take: 50,
    include: { service: true },
  });
}

/* ------------------------------------------------------------------ */
/* Unsubscribe from follow-up emails (reviews, 3-month reminder).      */
/* Booking confirmations and appointment reminders are always sent.    */
/* ------------------------------------------------------------------ */

function key() {
  const s = process.env.ADMIN_SESSION_SECRET ?? process.env.CRON_SECRET ?? "";
  return createHash("sha256").update(`bbpj-unsubscribe:${s}`).digest();
}

const tokenFor = (email: string) => createHmac("sha256", key()).update(email.toLowerCase()).digest("base64url").slice(0, 32);

export function verifyUnsubscribeToken(email: string, token: string) {
  const a = Buffer.from(token);
  const b = Buffer.from(tokenFor(email));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function unsubscribeUrl(email: string) {
  return `${siteBase()}/unsubscribe?e=${encodeURIComponent(email.toLowerCase())}&t=${tokenFor(email)}`;
}

/** Headers that give Gmail / Apple Mail their built-in one-tap "Unsubscribe" button. */
export function unsubscribeHeaders(email: string): Record<string, string> {
  const e = encodeURIComponent(email.toLowerCase());
  return {
    "List-Unsubscribe": `<${siteBase()}/api/unsubscribe?e=${e}&t=${tokenFor(email)}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

export async function isUnsubscribed(email: string) {
  const row = await prisma.emailContact.findUnique({ where: { email: email.toLowerCase() } });
  return Boolean(row?.unsubscribedAt);
}

export async function setUnsubscribed(email: string, unsubscribed: boolean) {
  const e = email.toLowerCase();
  const unsubscribedAt = unsubscribed ? new Date() : null;
  await prisma.emailContact.upsert({ where: { email: e }, update: { unsubscribedAt }, create: { email: e, unsubscribedAt } });
}
