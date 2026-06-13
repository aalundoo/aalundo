import { NextRequest, NextResponse } from "next/server";
import { getSession, createSession } from "@/lib/session";
import { getProfile, changeName, NAME_COOLDOWN_DAYS } from "@/lib/users";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/profile -> the signed-in user's profile + name-change eligibility.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const profile = await getProfile(session.user);
  return NextResponse.json({
    profile,
    isAdmin: isAdmin(session.user),
    cooldownDays: NAME_COOLDOWN_DAYS,
  });
}

// POST /api/profile { name } -> change display name (allowed once / 60 days).
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const result = await changeName(session.user, body.name ?? "");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Re-issue the session cookie so the new name shows everywhere immediately.
  await createSession({ user: { ...session.user, name: result.name! } });

  const profile = await getProfile({ ...session.user, name: result.name! });
  return NextResponse.json({ profile });
}
