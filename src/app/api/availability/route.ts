import { NextResponse, type NextRequest } from "next/server";
import { bookingWindow, getDaySlots } from "@/lib/availability";
import { prisma } from "@/lib/prisma";
import { isValidDateKey } from "@/lib/time";

export const dynamic = "force-dynamic";

/** GET /api/availability?serviceId=...&date=YYYY-MM-DD */
export async function GET(req: NextRequest) {
  const serviceId = req.nextUrl.searchParams.get("serviceId") ?? "";
  const date = req.nextUrl.searchParams.get("date") ?? "";

  if (!isValidDateKey(date)) return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  const { firstDay, lastDay } = bookingWindow();
  if (date < firstDay || date > lastDay) return NextResponse.json({ error: "Date outside booking window." }, { status: 400 });

  const service = await prisma.service.findFirst({ where: { id: serviceId, active: true } });
  if (!service) return NextResponse.json({ error: "Unknown service." }, { status: 404 });

  const slots = await getDaySlots(date, service.durationMin);
  return NextResponse.json({ date, slots }, { headers: { "Cache-Control": "no-store" } });
}
