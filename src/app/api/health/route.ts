import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health — used by the deploy pipeline (and uptime monitors).
 * `version` is the git commit written into DEPLOY_VERSION by CI, so the pipeline
 * can tell when the server has picked up a new release.
 */
export async function GET() {
  const version = await readFile(join(process.cwd(), "DEPLOY_VERSION"), "utf8")
    .then((v) => v.trim())
    .catch(() => "dev");

  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch (err) {
    console.error("[health] database check failed", err);
  }

  return NextResponse.json({ ok: db, version, db }, { status: db ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
