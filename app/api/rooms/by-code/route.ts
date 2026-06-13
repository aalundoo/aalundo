import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getRoomByCode } from "@/lib/rooms-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/rooms/by-code?code=ABC123 -> { id } of the matching room, or 404.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const code = req.nextUrl.searchParams.get("code") ?? "";
  const room = await getRoomByCode(code);
  if (!room) {
    return NextResponse.json({ error: "No room found for that code." }, { status: 404 });
  }
  return NextResponse.json({ id: room.id, name: room.name });
}
