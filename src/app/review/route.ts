import { NextResponse } from "next/server";
import { SALON } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * GET /review → the salon's Google "write a review" form.
 * The printed QR code in the salon points here (not straight to Google), so the
 * destination can change without reprinting. GOOGLE_REVIEW_URL in .env overrides it.
 */
export function GET() {
  const target = process.env.GOOGLE_REVIEW_URL?.trim() || SALON.googleReviewUrl;
  return NextResponse.redirect(target, { status: 302, headers: { "Cache-Control": "no-store", "X-LiteSpeed-Cache-Control": "no-cache" } });
}
