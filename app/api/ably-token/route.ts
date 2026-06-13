import { NextRequest, NextResponse } from "next/server";
import * as Ably from "ably";
import { getSession } from "@/lib/session";
import { getRoom, roomLimit } from "@/lib/rooms-store";
import { roomMemberCount, roomChannel, isVoiceConfigured } from "@/lib/ably-presence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/ably-token?room=ROOM
// Mints a short-lived Ably token scoped to just this room's channel. This is
// the only server involvement in signaling — the realtime connection itself
// runs browser <-> Ably, so it survives serverless function timeouts and works
// across instances (unlike the old in-memory SSE hub).
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  if (!isVoiceConfigured()) {
    return NextResponse.json(
      { error: "Voice isn't configured on the server (missing ABLY_API_KEY)." },
      { status: 503 },
    );
  }

  const roomId = req.nextUrl.searchParams.get("room");
  if (!roomId || !(await getRoom(roomId))) {
    return NextResponse.json({ error: "This room doesn't exist or has expired." }, { status: 404 });
  }
  if ((await roomMemberCount(roomId)) >= (await roomLimit(roomId))) {
    return NextResponse.json({ error: "This room is full." }, { status: 409 });
  }

  const channel = roomChannel(roomId);
  const rest = new Ably.Rest(process.env.ABLY_API_KEY!);
  const tokenRequest = await rest.auth.createTokenRequest({
    clientId: session.user.id, // trusted identity from the session
    capability: { [channel]: ["subscribe", "publish", "presence"] },
  });

  return NextResponse.json(tokenRequest);
}
