import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/session";
import { getRoom, roomLimit } from "@/lib/rooms-store";
import { addClient, removeClient, memberCount } from "@/lib/signal-hub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

// One-shot SSE response carrying a single app-level error, then ending. The
// client closes its EventSource on receiving a `type:"error"` message, so it
// won't reconnect into a loop.
function sseError(message: string): Response {
  return new Response(`data: ${JSON.stringify({ type: "error", message })}\n\n`, {
    headers: SSE_HEADERS,
  });
}

// GET /api/signal/stream?room=ROOM
// Opens the signaling channel. The browser receives joined/peer-join/peer-leave/
// signal/peer-state events here and POSTs its own messages to /api/signal/send.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return sseError("Please sign in again.");

  const roomId = req.nextUrl.searchParams.get("room");
  if (!roomId || !(await getRoom(roomId))) {
    return sseError("This room doesn't exist or has expired.");
  }
  if (memberCount(roomId) >= (await roomLimit(roomId))) {
    return sseError("This room is full.");
  }

  const peerId = randomUUID();
  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval>;
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      let alive = true;

      // Idempotent teardown: stop the heartbeat, drop presence, close stream.
      cleanup = () => {
        if (!alive) return;
        alive = false;
        clearInterval(heartbeat);
        removeClient(peerId);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      // Writing to a disconnected client throws — that's our signal it's gone,
      // so a failed enqueue triggers cleanup (the reliable cross-runtime way to
      // notice a dropped SSE connection; req.signal isn't dependable in dev).
      const enqueue = (s: string) => {
        if (!alive) return;
        try {
          controller.enqueue(encoder.encode(s));
        } catch {
          cleanup();
        }
      };

      enqueue("retry: 3000\n\n");
      addClient({ id: peerId, roomId, user: session.user, enqueue, closed: false });

      heartbeat = setInterval(() => enqueue(": ping\n\n"), 10000);
      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
