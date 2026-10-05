import { NextResponse, type NextRequest } from "next/server";
import { SALON } from "@/lib/config";
import { sendEmail, sendWhatsAppAlert } from "@/lib/notifications";
import { adminEmails, secret as envValue } from "@/lib/secrets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/notify/test?channel=whatsapp|email   (Authorization: Bearer $CRON_SECRET)
 * Sends a test alert to the owner so WhatsApp / email settings can be checked
 * without making a real booking. See DEPLOYMENT.md.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const channel = req.nextUrl.searchParams.get("channel") ?? "whatsapp";
  const stamp = new Date().toLocaleString("en-US", { timeZone: SALON.timeZone });

  try {
    if (channel === "email") {
      const to = adminEmails().join(", ");
      if (!to) return NextResponse.json({ ok: false, error: "ADMIN_EMAIL is not set" }, { status: 400 });
      if (!envValue("SMTP_HOST")) return NextResponse.json({ ok: false, error: "SMTP is not configured" }, { status: 400 });
      await sendEmail(to, "✅ Test email from your booking website", `<p>Email alerts are working (${stamp}).</p>`, `Email alerts are working (${stamp}).`);
      return NextResponse.json({ ok: true, sentTo: to });
    }
    if (!envValue("WHATSAPP_ALERT_NUMBER") || !envValue("CALLMEBOT_API_KEY")) {
      return NextResponse.json({ ok: false, error: "Set WHATSAPP_ALERT_NUMBER and CALLMEBOT_API_KEY in .env, then restart the app" }, { status: 400 });
    }
    await sendWhatsAppAlert(`✅ *Test alert* — ${SALON.name} website\nWhatsApp booking alerts are working (${stamp}).`);
    return NextResponse.json({ ok: true, sentTo: envValue("WHATSAPP_ALERT_NUMBER") });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 502 });
  }
}
