import { NextResponse } from "next/server";
import { listServicesFromDb } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function GET() {
  const services = await listServicesFromDb();
  return NextResponse.json(
    { services },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
