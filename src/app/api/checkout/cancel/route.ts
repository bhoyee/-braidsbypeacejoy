import { NextResponse, type NextRequest } from "next/server";
import { expireCheckoutSession } from "@/lib/booking";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/checkout/cancel { sessionId }
 * Client pressed "back" on Stripe Checkout → expire the session and free the
 * slot right away instead of waiting ~30 minutes for the hold to lapse.
 */
export async function POST(req: NextRequest) {
  const { sessionId } = ((await req.json().catch(() => ({}))) ?? {}) as { sessionId?: string };
  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return NextResponse.json({ error: "Invalid session." }, { status: 400 });
  }
  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId);
    if (session.status === "open") await stripe().checkout.sessions.expire(sessionId);
    if (session.status !== "complete") await expireCheckoutSession(sessionId);
  } catch (err) {
    console.error("[checkout/cancel]", err);
  }
  return NextResponse.json({ ok: true });
}
