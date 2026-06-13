import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  clientBelongsToUser,
  clientRoom,
  relaySignal,
  broadcastState,
} from "@/lib/signal-hub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/signal/send
//   { from, type:"signal", to, data }  -> relay an offer/answer/ICE to one peer
//   { from, type:"state", muted }      -> broadcast mute state to the room
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.from) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  // Only the owner of that signaling client may send as it.
  if (!clientBelongsToUser(body.from, session.user.id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (body.type === "signal" && body.to) {
    relaySignal(body.from, body.to, body.data);
  } else if (body.type === "state") {
    const roomId = clientRoom(body.from);
    if (roomId) broadcastState(roomId, body.from, !!body.muted);
  }

  return NextResponse.json({ ok: true });
}
