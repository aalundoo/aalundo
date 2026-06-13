import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { buildAuthorizeURL } from "@/lib/google";

// GET /api/auth/login -> redirect to Google's OAuth2 consent.
export async function GET() {
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(buildAuthorizeURL(state));
  res.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  return res;
}
