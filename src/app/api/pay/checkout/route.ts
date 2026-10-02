import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { lookupFilter } from "@/lib/booking";
import { CURRENCY, SALON } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { siteUrl, stripe } from "@/lib/stripe";
import { formatSalonDate, formatSalonTime } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ bookingId: z.string().min(1), q: z.string().min(4).max(191) });

/**
 * POST /api/pay/checkout { bookingId, q }
 * Starts a Stripe Checkout Session for the remaining balance
 * (service price − amount already paid, i.e. − the $30 deposit).
 * `q` (the email/code the visitor searched with) must match the booking.
 */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { bookingId, q } = parsed.data;

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, ...lookupFilter(q), paymentStatus: "DEPOSIT_PAID" },
    include: { service: true },
  });
  if (!booking) return NextResponse.json({ error: "No outstanding balance found for this booking." }, { status: 404 });

  const balanceCents = booking.totalCents - booking.amountPaidCents;
  if (balanceCents <= 0) return NextResponse.json({ error: "This booking is already fully settled." }, { status: 409 });

  // Void any earlier unpaid balance sessions so the client can't pay twice from two tabs.
  const stale = await prisma.payment.findMany({
    where: { bookingId, kind: "BALANCE", status: "PENDING" },
    select: { stripeSessionId: true },
  });
  for (const p of stale) {
    await stripe()
      .checkout.sessions.expire(p.stripeSessionId)
      .catch(() => undefined); // already expired/complete — webhook will reconcile
  }
  if (stale.length) {
    await prisma.payment.updateMany({
      where: { bookingId, kind: "BALANCE", status: "PENDING" },
      data: { status: "EXPIRED" },
    });
  }

  const metadata = {
    kind: "BALANCE",
    bookingId: booking.id,
    bookingCode: booking.bookingCode,
    clientName: booking.clientName,
    clientEmail: booking.clientEmail,
    clientPhone: booking.clientPhone,
    appointmentAt: booking.appointmentAt.toISOString(),
    serviceId: booking.serviceId,
  };

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    allowed_payment_method_types: ["card", "link"],
    customer_email: booking.clientEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: CURRENCY,
          unit_amount: balanceCents,
          product_data: {
            name: `Remaining balance — ${booking.service.name} (${booking.bookingCode})`,
            description: `${formatSalonDate(booking.appointmentAt)} at ${formatSalonTime(booking.appointmentAt)} · ${SALON.fullAddress}`,
          },
        },
      },
    ],
    metadata,
    payment_intent_data: { metadata, description: `Balance ${booking.bookingCode} — ${booking.service.name}` },
    client_reference_id: booking.id,
    success_url: `${siteUrl()}/pay/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/pay?code=${booking.bookingCode}`,
  });

  await prisma.payment.create({
    data: { bookingId: booking.id, kind: "BALANCE", amountCents: balanceCents, stripeSessionId: session.id },
  });

  return NextResponse.json({ url: session.url });
}
