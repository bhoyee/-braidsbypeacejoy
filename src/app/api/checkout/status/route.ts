import { NextResponse, type NextRequest } from "next/server";
import { confirmCheckoutSession, toPublicBooking } from "@/lib/booking";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/checkout/status?session_id=cs_...
 * The "instant check": the success page asks Stripe directly whether the session
 * was paid and, if so, locks the booking immediately — without waiting for the
 * webhook. Idempotent with the webhook handler.
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id") ?? "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return NextResponse.json({ error: "Invalid session." }, { status: 400 });

  let session;
  try {
    session = await stripe().checkout.sessions.retrieve(sessionId);
  } catch {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  if (session.payment_status !== "paid") {
    return NextResponse.json({ status: session.status === "expired" ? "expired" : "processing" });
  }

  const outcome = await confirmCheckoutSession(session);
  if (outcome.state === "confirmed") {
    return NextResponse.json({ status: "confirmed", kind: outcome.kind, booking: toPublicBooking(outcome.booking) });
  }
  if (outcome.state === "refunded") {
    return NextResponse.json({ status: "refunded", booking: toPublicBooking(outcome.booking) });
  }
  return NextResponse.json({ status: "processing" });
}
