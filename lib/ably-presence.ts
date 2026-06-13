// Server-side helpers for reading room presence from Ably. Replaces the old
// in-memory hub's memberCount — works across serverless instances because the
// source of truth is Ably, not this process's memory.

import * as Ably from "ably";

let rest: Ably.Rest | null = null;

export function isVoiceConfigured(): boolean {
  return !!process.env.ABLY_API_KEY;
}

function getRest(): Ably.Rest | null {
  if (!process.env.ABLY_API_KEY) return null;
  if (!rest) rest = new Ably.Rest(process.env.ABLY_API_KEY);
  return rest;
}

export function roomChannel(roomId: string): string {
  return `room:${roomId}`;
}

// Short cache so the lobby (which polls every few seconds, across many rooms)
// doesn't hammer Ably's REST presence endpoint.
const cache = new Map<string, { n: number; at: number }>();
const TTL_MS = 3000;

// Count the live members in a room via Ably REST presence. Each browser
// connection is one presence member, so this is the participant count.
export async function roomMemberCount(roomId: string): Promise<number> {
  const r = getRest();
  if (!r) return 0;

  const cached = cache.get(roomId);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.n;

  try {
    const page = await r.channels.get(roomChannel(roomId)).presence.get({ limit: 100 });
    const n = page.items.length;
    cache.set(roomId, { n, at: Date.now() });
    return n;
  } catch {
    return cached?.n ?? 0; // keep last known on transient errors
  }
}
