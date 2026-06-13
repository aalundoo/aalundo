import { NextRequest, NextResponse } from "next/server";
import { pruneExpired } from "@/lib/rooms-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/cron/prune -> delete expired custom rooms. Idempotent and safe to
// call from an external scheduler (e.g. Vercel Cron) too. If CRON_SECRET is set,
// require it as ?key= or an Authorization: Bearer header.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const key =
      req.nextUrl.searchParams.get("key") ??
      req.headers.get("authorization")?.replace("Bearer ", "");
    if (key !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const pruned = await pruneExpired();
  return NextResponse.json({ pruned });
}
