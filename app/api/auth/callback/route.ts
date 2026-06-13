import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, getCurrentUser } from "@/lib/google";
import { createSession } from "@/lib/session";
import { syncUser } from "@/lib/users";

// GET /api/auth/callback?code=...&state=... — Google redirects here.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? url.origin;

  if (error) return NextResponse.redirect(`${base}/?error=${encodeURIComponent(error)}`);
  if (!code) return NextResponse.redirect(`${base}/?error=missing_code`);

  const expectedState = req.cookies.get("oauth_state")?.value;
  if (!expectedState || expectedState !== state) {
    return NextResponse.redirect(`${base}/?error=state_mismatch`);
  }

  try {
    const token = await exchangeCode(code);
    const gUser = await getCurrentUser(token.access_token);
    const user = await syncUser(gUser); // applies any saved custom name
    await createSession({ user });

    const res = NextResponse.redirect(`${base}/`);
    res.cookies.delete("oauth_state");
    return res;
  } catch (e) {
    console.error("OAuth callback failed:", e);
    return NextResponse.redirect(`${base}/?error=auth_failed`);
  }
}
