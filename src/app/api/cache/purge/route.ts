import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/cache/purge   (Authorization: Bearer $CRON_SECRET)
 *
 * The hosting's LiteSpeed web server caches pages. This response carries
 * LiteSpeed's purge header, which empties that cache for the whole site, so a
 * new release shows immediately. Called by deploy/server-deploy.sh after each deploy.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(
    { purged: true },
    { headers: { "X-LiteSpeed-Purge": "*", "Cache-Control": "no-store", "X-LiteSpeed-Cache-Control": "no-cache" } },
  );
}
