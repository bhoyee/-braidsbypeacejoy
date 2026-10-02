import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { validateStart } from "@/lib/availability";
import { createDepositHold, releaseHold, SlotTakenError } from "@/lib/booking";
import { CURRENCY, DEPOSIT_CENTS, SALON } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { siteUrl, stripe } from "@/lib/stripe";
import { formatSalonDate, formatSalonTime } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  serviceId: z.string().min(1),
  appointmentAt: z.iso.datetime(),
  clientName: z.string().trim().min(2).max(100),
  clientEmail: z.email().max(191),
  clientPhone: z
    .string()
    .trim()
    .regex(/^[+()\-.\s\d]{10,20}$/, "Enter a valid phone number"),
});

/**
 * POST /api/checkout — $30 deposit.
 * 1. Validate the slot against operating hours.
 * 2. Atomically hold the slot (PENDING_DEPOSIT) so nobody else can pay for it.
 * 3. Create a Stripe Checkout Session for exactly 3000 cents.
 * The booking only becomes DEPOSIT_PAID once Stripe proves payment (webhook / status check).
 */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  const input = parsed.data;
  const start = new Date(input.appointmentAt);

  const service = await prisma.service.findFirst({ where: { id: input.serviceId, active: true } });
  if (!service) return NextResponse.json({ error: "Unknown service." }, { status: 404 });

  const invalid = validateStart(start, service.durationMin);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 422 });

  let hold: Awaited<ReturnType<typeof createDepositHold>>;
  try {
    hold = await createDepositHold({ service, start, ...input });
  } catch (err) {
    if (err instanceof SlotTakenError) return NextResponse.json({ error: err.message }, { status: 409 });
    throw err;
  }
  const { booking, holdExpiresAt } = hold;

  const metadata = {
    kind: "DEPOSIT",
    bookingId: booking.id,
    bookingCode: booking.bookingCode,
    clientName: input.clientName,
    clientEmail: booking.clientEmail,
    clientPhone: input.clientPhone,
    appointmentAt: start.toISOString(),
    serviceId: service.id,
  };

  try {
    const session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        // Card (incl. Apple Pay / Google Pay wallets) + Link only. Stripe v23 replaced
        // payment_method_types with this filter; Link must be enabled in Dashboard → Payment methods.
        allowed_payment_method_types: ["card", "link"],
        customer_email: booking.clientEmail,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: CURRENCY,
              unit_amount: DEPOSIT_CENTS,
              product_data: {
                name: `Non-refundable booking deposit — ${service.name}`,
                description: `${formatSalonDate(start)} at ${formatSalonTime(start)} · ${SALON.fullAddress}`,
              },
            },
          },
        ],
        metadata,
        payment_intent_data: {
          metadata,
          description: `Deposit ${booking.bookingCode} — ${service.name}`,
        },
        client_reference_id: booking.id,
        expires_at: Math.floor(holdExpiresAt.getTime() / 1000),
        success_url: `${siteUrl()}/book/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl()}/book?canceled=1&service=${service.slug}&session_id={CHECKOUT_SESSION_ID}`,
      },
      { idempotencyKey: `deposit_${booking.id}` },
    );

    await prisma.$transaction([
      prisma.booking.update({ where: { id: booking.id }, data: { stripeSessionId: session.id } }),
      prisma.payment.create({
        data: { bookingId: booking.id, kind: "DEPOSIT", amountCents: DEPOSIT_CENTS, stripeSessionId: session.id },
      }),
    ]);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] failed to create session", err);
    await releaseHold(booking.id);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
  }
}
