// Admin allow-list. Set ADMIN_EMAILS to a comma-separated list of Google
// account emails, e.g.  ADMIN_EMAILS=rishvanrv7@gmail.com,someone@gmail.com

import type { AppUser } from "./google";

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

export function isAdmin(user: Pick<AppUser, "email"> | null | undefined): boolean {
  return isAdminEmail(user?.email);
}
