import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";

// POST or GET /api/auth/logout -> clear the session cookie and go home.
function logout() {
  destroySession();
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  return NextResponse.redirect(`${base}/`, { status: 303 });
}

export async function GET() {
  return logout();
}

export async function POST() {
  return logout();
}
