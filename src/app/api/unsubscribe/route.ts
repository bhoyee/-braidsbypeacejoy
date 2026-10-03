import { NextResponse, type NextRequest } from "next/server";
import { setUnsubscribed, verifyUnsubscribeToken } from "@/lib/clients";
import { siteBase } from "@/lib/email-template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/unsubscribe?e=…&t=…  — RFC 8058 one-click unsubscribe, used by the
 * "Unsubscribe" button Gmail / Apple Mail show at the top of follow-up emails.
 */
export async function POST(req: NextRequest) {
  const e = req.nextUrl.searchParams.get("e") ?? "";
  const t = req.nextUrl.searchParams.get("t") ?? "";
  if (!e || !t || !verifyUnsubscribeToken(e, t)) return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  await setUnsubscribed(e, true);
  return NextResponse.json({ ok: true });
}

/** Opening the link in a browser shows the confirmation page instead. */
export function GET(req: NextRequest) {
  const url = new URL("/unsubscribe", siteBase()); // not req origin: behind LiteSpeed that is the internal port
  url.search = req.nextUrl.search;
  return NextResponse.redirect(url);
}
