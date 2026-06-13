// User profiles in MongoDB. Stores the latest Google info plus an optional
// custom display name that can only be changed once every 60 days.

import { getDb, isDbConfigured } from "./db";
import type { AppUser } from "./google";

const COLL = "users";
export const NAME_COOLDOWN_DAYS = 60;
const COOLDOWN_MS = NAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

export interface Profile {
  id: string;
  name: string; // effective display name (custom if set, else Google's)
  googleName: string;
  avatar: string | null;
  email: string | null;
  nameChangedAt: number | null;
  canChangeName: boolean;
  nextChangeAt: number | null;
}

// Called on login: refresh stored Google info, keep custom name + timestamp.
// Returns the user with the *effective* display name applied.
export async function syncUser(g: AppUser): Promise<AppUser> {
  if (!isDbConfigured()) return g;
  const db = await getDb();
  const existing = await db.collection(COLL).findOne({ id: g.id });
  await db.collection(COLL).updateOne(
    { id: g.id },
    {
      $set: { id: g.id, googleName: g.name, avatar: g.avatar, email: g.email, lastLogin: Date.now() },
      $setOnInsert: { customName: null, nameChangedAt: null },
    },
    { upsert: true },
  );
  return { ...g, name: existing?.customName ?? g.name };
}

export async function getProfile(user: AppUser): Promise<Profile> {
  let doc: Record<string, unknown> | null = null;
  if (isDbConfigured()) {
    const db = await getDb();
    doc = await db.collection(COLL).findOne({ id: user.id });
  }
  const nameChangedAt = (doc?.nameChangedAt as number | null) ?? null;
  const canChangeName = !nameChangedAt || Date.now() - nameChangedAt >= COOLDOWN_MS;
  return {
    id: user.id,
    name: (doc?.customName as string) ?? (doc?.googleName as string) ?? user.name,
    googleName: (doc?.googleName as string) ?? user.name,
    avatar: (doc?.avatar as string | null) ?? user.avatar,
    email: (doc?.email as string | null) ?? user.email,
    nameChangedAt,
    canChangeName,
    nextChangeAt: nameChangedAt ? nameChangedAt + COOLDOWN_MS : null,
  };
}

export async function changeName(
  user: AppUser,
  newName: string,
): Promise<{ ok: boolean; error?: string; name?: string }> {
  if (!isDbConfigured()) return { ok: false, error: "Storage isn't configured." };
  const clean = String(newName).trim().replace(/\s+/g, " ").slice(0, 32);
  if (clean.length < 2) return { ok: false, error: "Name must be at least 2 characters." };

  const db = await getDb();
  const doc = await db.collection(COLL).findOne({ id: user.id });
  const nameChangedAt = (doc?.nameChangedAt as number | null) ?? null;
  if (nameChangedAt && Date.now() - nameChangedAt < COOLDOWN_MS) {
    const days = Math.ceil((nameChangedAt + COOLDOWN_MS - Date.now()) / 86_400_000);
    return { ok: false, error: `You can change your name again in ${days} day${days === 1 ? "" : "s"}.` };
  }

  await db.collection(COLL).updateOne(
    { id: user.id },
    { $set: { id: user.id, customName: clean, nameChangedAt: Date.now() } },
    { upsert: true },
  );
  return { ok: true, name: clean };
}
