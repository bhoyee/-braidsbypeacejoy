import { NextResponse, type NextRequest } from "next/server";
import { lookupFilter, toPublicBooking } from "@/lib/booking";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/pay/lookup?q=<email | booking code>
 * Returns bookings with an outstanding balance (full price − amount already paid).
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 4 || q.length > 191) {
    return NextResponse.json({ error: "Enter your email, phone number or booking code." }, { status: 400 });
  }

  const bookings = await prisma.booking.findMany({
    where: {
      ...lookupFilter(q),
      paymentStatus: "DEPOSIT_PAID",
      // Hide appointments more than 30 days in the past.
      appointmentAt: { gt: new Date(Date.now() - 30 * 86_400_000) },
    },
    include: { service: true },
    orderBy: { appointmentAt: "asc" },
    take: 10,
  });

  return NextResponse.json(
    { bookings: bookings.map(toPublicBooking).filter((b) => b.balanceCents > 0) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
