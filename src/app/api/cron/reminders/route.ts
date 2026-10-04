import { NextResponse, type NextRequest } from "next/server";
import { autoCompleteVisits, sendRetentionReminders, sendReviewRequests } from "@/lib/followups";
import { sendAppointmentReminders } from "@/lib/reminders";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/reminders   (Authorization: Bearer $CRON_SECRET)
 *
 * Run EVERY MINUTE from cPanel → Cron Jobs:
 *   * * * * * curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://api.braidsbypeacejoy.com/api/cron/reminders > /dev/null 2>&1
 *
 * Sends appointment reminders 24 hours and 2 hours ahead (src/lib/reminders.ts).
 * Also sweeps expired checkout holds, and sends follow-ups (src/lib/followups.ts).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const sent = await sendAppointmentReminders(now);

  const swept = await prisma.booking.updateMany({
    where: { paymentStatus: "PENDING_DEPOSIT", holdExpiresAt: { lt: new Date(now.getTime() - 5 * 60_000) } },
    data: { paymentStatus: "EXPIRED", holdExpiresAt: null },
  });

  // Follow-ups (only between 10 AM and 6 PM salon time): review requests and the
  // "come back" emails. A failure here never blocks the reminders above.
  const autoCompleted = await autoCompleteVisits(now).catch((e) => (console.error("[cron] auto-complete", e), 0));
  const [reviews, retention] = await Promise.all([
    sendReviewRequests(now).catch((e) => (console.error("[cron] review requests", e), 0)),
    sendRetentionReminders(now).catch((e) => (console.error("[cron] retention", e), 0)),
  ]);

  return NextResponse.json({ ok: true, remindersSent: sent, holdsReleased: swept.count, autoCompleted, reviewRequests: reviews, retentionEmails: retention });
}
