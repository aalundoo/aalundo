import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listAllRooms, createRoom } from "@/lib/rooms-store";
import { isDbConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/rooms -> default rooms + active custom rooms, each with live counts.
export async function GET() {
  try {
    const rooms = await listAllRooms();
    return NextResponse.json({ rooms });
  } catch (e) {
    console.error("GET /api/rooms failed:", e);
    return NextResponse.json({ error: "Failed to load rooms." }, { status: 502 });
  }
}

// POST /api/rooms { name, hours, limit } -> create a custom room (stored in Mongo).
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "Room storage isn't configured yet (set MONGODB_URI)." },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));
  if (!String(body.name ?? "").trim()) {
    return NextResponse.json({ error: "A room name is required." }, { status: 400 });
  }

  try {
    const room = await createRoom(body.name, body.hours, body.limit, body.image);
    return NextResponse.json({ room }, { status: 201 });
  } catch (e) {
    console.error("POST /api/rooms failed:", e);
    return NextResponse.json({ error: "Failed to create the room." }, { status: 502 });
  }
}
