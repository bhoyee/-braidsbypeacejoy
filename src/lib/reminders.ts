import "server-only";
import { notifyAppointmentReminder } from "./notifications";
import { prisma } from "./prisma";

// Appointment reminders (client email + owner email/WhatsApp), run every minute by
// the cron route. Each reminder is claimed atomically, so it is never sent twice.

const HOUR = 3_600_000;

const REMINDERS = [
  {
    kind: "DAY_BEFORE",
    field: "dayBeforeReminderSentAt",
    before: 24 * HOUR,
    // If the cron was down, still send up to 20 hours ahead — never later (it says "tomorrow").
    latest: 20 * HOUR,
    // Booked within 36 hours of the appointment? The confirmation was just sent — skip this one.
    minBookedAhead: 36 * HOUR,
    label: "24-hour reminder sent",
  },
  {
    kind: "SOON",
    field: "reminderSentAt",
    before: 2 * HOUR,
    latest: 0,
    minBookedAhead: 3 * HOUR,
    label: "2-hour reminder sent",
  },
] as const;

export async function sendAppointmentReminders(now = new Date()) {
  let sent = 0;
  for (const r of REMINDERS) {
    const due = await prisma.booking.findMany({
      where: {
        paymentStatus: { in: ["DEPOSIT_PAID", "FULLY_SETTLED"] },
        [r.field]: null,
        appointmentAt: { gt: new Date(now.getTime() + r.latest), lte: new Date(now.getTime() + r.before) },
      },
      include: { service: true },
    });
    for (const booking of due) {
      const claim = await prisma.booking.updateMany({ where: { id: booking.id, [r.field]: null }, data: { [r.field]: now } });
      if (claim.count !== 1) continue; // another run got it
      if (booking.appointmentAt.getTime() - booking.createdAt.getTime() < r.minBookedAhead) continue; // booked last-minute
      try {
        await notifyAppointmentReminder(booking, r.kind);
        await prisma.activityLog.create({ data: { bookingId: booking.id, action: r.label, detail: "Client emailed · owner alerted" } });
        sent++;
      } catch (err) {
        console.error("[reminders] failed", err);
      }
    }
  }
  return sent;
}
