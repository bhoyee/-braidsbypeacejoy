import { NextResponse, type NextRequest } from "next/server";
import { SALON } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * GET /api/whatsapp → redirects to a WhatsApp chat with the salon.
 * The number comes from WHATSAPP_CHAT_NUMBER in .env (read on every click), so it
 * can be changed on the server without a redeploy. Falls back to the salon phone.
 */
export function GET(req: NextRequest) {
  const fromEnv = (process.env.WHATSAPP_CHAT_NUMBER ?? "").replace(/\D/g, "");
  const fallback = `1${SALON.phone.replace(/\D/g, "")}`;
  const number = fromEnv.length >= 10 ? fromEnv : fallback;

  const page = req.nextUrl.searchParams.get("from");
  const text = `Hi Braids by Peace Joy! I'd like to ask about booking${page && page !== "/" ? ` (from ${page})` : ""}.`;
  return NextResponse.redirect(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}
