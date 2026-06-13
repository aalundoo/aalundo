// Room registry:
//   * 8 default game rooms (hardcoded base in rooms-data.mjs) that admins can
//     edit — edits are stored as "overrides" in MongoDB and merged on read.
//   * user-created custom rooms stored in MongoDB (expire after N hours).
// Live participant counts come from the in-memory signaling hub.

import { randomUUID } from "crypto";
import { getDb, isDbConfigured } from "./db";
import { DEFAULT_ROOMS, customGradient, MAX_LIMIT } from "./rooms-data.mjs";
import { memberCount } from "./signal-hub";

const ROOMS = "rooms";
const OVERRIDES = "room_overrides";
const ALLOWED_HOURS = [6, 12, 24];

export interface Room {
  id: string;
  name: string;
  description: string;
  emoji: string;
  image: string | null;
  gradient: string;
  limit: number;
  custom: boolean;
  code: string | null;
  expiresAt?: number;
  count: number;
}

export interface RoomOverride {
  name?: string;
  description?: string;
  emoji?: string;
  image?: string | null;
  limit?: number;
}

function withCount<T extends { id: string }>(r: T) {
  return { ...r, count: memberCount(r.id) };
}

function mergeDefault(
  base: (typeof DEFAULT_ROOMS)[number],
  ov: RoomOverride | undefined,
): Room {
  return withCount({
    id: base.id,
    name: ov?.name ?? base.name,
    description: ov?.description ?? base.description,
    emoji: ov?.emoji ?? base.emoji,
    image: ov?.image ?? null,
    gradient: base.gradient,
    limit: ov?.limit ?? base.limit,
    custom: false,
    code: base.id.toUpperCase(),
  });
}

async function loadOverrides(): Promise<Map<string, RoomOverride>> {
  if (!isDbConfigured()) return new Map();
  const db = await getDb();
  const docs = await db.collection(OVERRIDES).find({}).toArray();
  return new Map(docs.map((d) => [d.id as string, d as RoomOverride]));
}

export async function listAllRooms(): Promise<Room[]> {
  const overrides = await loadOverrides();
  const defaults = DEFAULT_ROOMS.map((r) => mergeDefault(r, overrides.get(r.id)));
  if (!isDbConfigured()) return defaults;

  const db = await getDb();
  const docs = await db
    .collection(ROOMS)
    .find({ expiresAt: { $gt: Date.now() } })
    .sort({ expiresAt: -1 })
    .toArray();

  const customs = docs.map((d) =>
    withCount({
      id: d.id,
      name: d.name,
      description: d.description,
      emoji: d.emoji,
      image: d.image ?? null,
      gradient: d.gradient,
      limit: d.limit,
      custom: true,
      code: d.code ?? null,
      expiresAt: d.expiresAt,
    }),
  );
  return [...defaults, ...customs];
}

function genCode(): string {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I
  let s = "";
  for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

export async function createRoom(
  name: string,
  hours: number,
  limit: number,
  image?: string | null,
): Promise<Room> {
  if (!isDbConfigured()) throw new Error("MONGODB_URI not configured");
  const clean = String(name).trim().slice(0, 40) || "New room";
  const h = ALLOWED_HOURS.includes(Number(hours)) ? Number(hours) : 24;
  const lim = Math.min(MAX_LIMIT, Math.max(2, Math.round(Number(limit) || 8)));
  const id = "c-" + randomUUID().slice(0, 8);
  const img = sanitizeImage(image);
  const db = await getDb();

  // Unique, shareable join code.
  let code = genCode();
  for (let i = 0; i < 5; i++) {
    if (!(await db.collection(ROOMS).findOne({ code }))) break;
    code = genCode();
  }

  const doc = {
    id,
    name: clean,
    description: `Custom room · expires in ${h}h`,
    emoji: "🎧",
    image: img,
    gradient: customGradient(id),
    limit: lim,
    code,
    expiresAt: Date.now() + h * 60 * 60 * 1000,
    createdAt: Date.now(),
  };

  await db.collection(ROOMS).insertOne({ ...doc });
  return {
    id: doc.id,
    name: doc.name,
    description: doc.description,
    emoji: doc.emoji,
    image: doc.image,
    gradient: doc.gradient,
    limit: doc.limit,
    code: doc.code,
    expiresAt: doc.expiresAt,
    custom: true,
    count: 0,
  };
}

export function isDefaultRoom(id: string): boolean {
  return DEFAULT_ROOMS.some((r) => r.id === id);
}

// Admin: save an override for a default room (only the provided fields).
export async function updateDefaultRoom(
  id: string,
  fields: RoomOverride,
): Promise<Room | null> {
  if (!isDbConfigured()) throw new Error("MONGODB_URI not configured");
  const base = DEFAULT_ROOMS.find((r) => r.id === id);
  if (!base) return null;

  const set: RoomOverride = {};
  if (typeof fields.name === "string") set.name = fields.name.trim().slice(0, 40) || base.name;
  if (typeof fields.description === "string") set.description = fields.description.trim().slice(0, 80);
  if (typeof fields.emoji === "string") set.emoji = fields.emoji.trim().slice(0, 8) || base.emoji;
  if (fields.image !== undefined) set.image = sanitizeImage(fields.image);
  if (fields.limit !== undefined) set.limit = Math.min(MAX_LIMIT, Math.max(2, Math.round(Number(fields.limit) || base.limit)));

  const db = await getDb();
  await db.collection(OVERRIDES).updateOne({ id }, { $set: { id, ...set } }, { upsert: true });
  return mergeDefault(base, { ...(await loadOverrides()).get(id) });
}

export async function getRoom(id: string): Promise<Room | null> {
  const base = DEFAULT_ROOMS.find((r) => r.id === id);
  if (base) {
    const overrides = await loadOverrides();
    return mergeDefault(base, overrides.get(id));
  }
  if (!isDbConfigured()) return null;

  const db = await getDb();
  const doc = await db.collection(ROOMS).findOne({ id, expiresAt: { $gt: Date.now() } });
  if (!doc) return null;
  return withCount({
    id: doc.id,
    name: doc.name,
    description: doc.description,
    emoji: doc.emoji,
    image: doc.image ?? null,
    gradient: doc.gradient,
    limit: doc.limit,
    custom: true,
    code: doc.code ?? null,
    expiresAt: doc.expiresAt,
  });
}

// Resolve a share code -> room. Accepts a default room's id-as-code or a
// custom room's generated code (case-insensitive).
export async function getRoomByCode(code: string): Promise<Room | null> {
  const c = String(code).trim().toUpperCase();
  if (!c) return null;
  const def = DEFAULT_ROOMS.find((r) => r.id.toUpperCase() === c);
  if (def) return getRoom(def.id);
  if (!isDbConfigured()) return null;
  const db = await getDb();
  const doc = await db.collection(ROOMS).findOne({ code: c, expiresAt: { $gt: Date.now() } });
  return doc ? getRoom(doc.id) : null;
}

// Admin: delete a custom room (defaults can't be deleted).
export async function deleteRoom(id: string): Promise<boolean> {
  if (isDefaultRoom(id)) return false;
  if (!isDbConfigured()) return false;
  const db = await getDb();
  const res = await db.collection(ROOMS).deleteOne({ id });
  return (res.deletedCount ?? 0) > 0;
}

export async function roomLimit(id: string): Promise<number> {
  return (await getRoom(id))?.limit ?? MAX_LIMIT;
}

export async function pruneExpired(): Promise<number> {
  if (!isDbConfigured()) return 0;
  const db = await getDb();
  const res = await db.collection(ROOMS).deleteMany({ expiresAt: { $lte: Date.now() } });
  return res.deletedCount ?? 0;
}

// Only allow http(s) image URLs; anything else becomes null.
function sanitizeImage(image: string | null | undefined): string | null {
  if (!image) return null;
  const s = String(image).trim();
  if (!s) return null;
  return /^https?:\/\//i.test(s) ? s.slice(0, 500) : null;
}
