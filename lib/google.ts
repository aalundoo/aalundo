// Google OAuth2 (OpenID Connect) — used only to identify the user.

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export interface AppUser {
  id: string;
  name: string;
  avatar: string | null;
  email: string | null;
}

export function buildAuthorizeURL(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  id_token: string;
  scope: string;
  token_type: string;
}

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    code,
    grant_type: "authorization_code",
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

interface GoogleUserInfo {
  sub: string;
  name?: string;
  given_name?: string;
  picture?: string;
  email?: string;
}

export async function getCurrentUser(accessToken: string): Promise<AppUser> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google userinfo -> ${res.status}`);
  const u = (await res.json()) as GoogleUserInfo;
  return {
    id: u.sub,
    name: u.name ?? u.given_name ?? u.email ?? "Player",
    avatar: u.picture ?? null,
    email: u.email ?? null,
  };
}
