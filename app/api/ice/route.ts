import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/ice -> the ICE servers the browser should use for WebRTC.
//
// Always includes public STUN. If TURN_* env vars are set, a TURN relay is
// added too — required for users behind symmetric NAT / strict firewalls /
// mobile networks, where peer-to-peer over STUN alone fails (the classic
// "works on the same WiFi but not across networks" symptom).
//
// Served from the server (not baked into the client bundle) so credentials
// aren't shipped to every page load, and so this can later mint short-lived
// credentials from a TURN provider instead of using static ones.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const iceServers: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];

  const urls = (process.env.TURN_URLS ?? "")
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);
  const username = process.env.TURN_USERNAME;
  const credential = process.env.TURN_CREDENTIAL;

  if (urls.length && username && credential) {
    iceServers.push({ urls, username, credential });
  }

  // Cache briefly at the edge — these change rarely (and never per-user while
  // credentials are static).
  return NextResponse.json(
    { iceServers },
    { headers: { "Cache-Control": "private, max-age=300" } },
  );
}
