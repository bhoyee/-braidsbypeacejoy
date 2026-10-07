import { NextResponse } from "next/server";
import { bookingWindow, closedDays } from "@/lib/availability";

export const dynamic = "force-dynamic";

/** GET /api/availability/closed → salon dates in the booking window that are fully closed (owner time off). */
export async function GET() {
  const { firstDay, lastDay } = bookingWindow();
  const days = await closedDays(firstDay, lastDay);
  return NextResponse.json({ days }, { headers: { "Cache-Control": "no-store" } });
}
