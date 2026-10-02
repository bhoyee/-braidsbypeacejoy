import { NextResponse, type NextRequest } from "next/server";
import { REMINDER_MINUTES_BEFORE } from "@/lib/config";
import { notifyAppointmentReminder } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/reminders   (Authorization: Bearer $CRON_SECRET)
 *
 * Run EVERY MINUTE from cPanel → Cron Jobs:
 *   * * * * * curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://api.braidsbypeacejoy.com/api/cron/reminders > /dev/null 2>&1
 *
 * Sends the client + admin reminder once an appointment is ≤ 30 minutes away.
 * `reminderSentAt` is claimed atomically, so overlapping runs never double-send.
 * Also sweeps expired checkout holds as housekeeping.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + REMINDER_MINUTES_BEFORE * 60_000);

  const due = await prisma.booking.findMany({
    where: {
      paymentStatus: { in: ["DEPOSIT_PAID", "FULLY_SETTLED"] },
      reminderSentAt: null,
      appointmentAt: { gt: now, lte: horizon },
    },
    include: { service: true },
  });

  let sent = 0;
  for (const booking of due) {
    const claim = await prisma.booking.updateMany({
      where: { id: booking.id, reminderSentAt: null },
      data: { reminderSentAt: now },
    });
    if (claim.count !== 1) continue; // another run got it
    await notifyAppointmentReminder(booking);
    sent++;
  }

  const swept = await prisma.booking.updateMany({
    where: { paymentStatus: "PENDING_DEPOSIT", holdExpiresAt: { lt: new Date(now.getTime() - 5 * 60_000) } },
    data: { paymentStatus: "EXPIRED", holdExpiresAt: null },
  });

  return NextResponse.json({ ok: true, remindersSent: sent, holdsReleased: swept.count });
}
