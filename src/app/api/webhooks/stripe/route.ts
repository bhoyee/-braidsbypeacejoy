import { NextResponse, type NextRequest } from "next/server";
import { confirmCheckoutSession, expireCheckoutSession, type CheckoutSession } from "@/lib/booking";
import { stripe } from "@/lib/stripe";

// Raw body + Node crypto are required for signature verification.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/stripe
 * Stripe Dashboard → Developers → Webhooks → endpoint:
 *   https://<API host>/api/webhooks/stripe
 * Events: checkout.session.completed, checkout.session.async_payment_succeeded,
 *         checkout.session.expired
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: "Missing signature." }, { status: 400 });

  // Must be the exact raw bytes Stripe signed — never JSON.parse before verifying.
  const rawBody = await req.text();

  let event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.warn("[webhook] signature verification failed", (err as Error).message);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as CheckoutSession;
        const outcome = await confirmCheckoutSession(session);
        console.info(`[webhook] ${event.type} ${session.id} → ${outcome.state}`);
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as CheckoutSession;
        await expireCheckoutSession(session.id);
        break;
      }
      default:
        break; // acknowledge everything else
    }
  } catch (err) {
    // 500 → Stripe retries with exponential backoff (processing is idempotent).
    console.error(`[webhook] failed to process ${event.type} ${event.id}`, err);
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
