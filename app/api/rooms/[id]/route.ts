import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isAdmin } from "@/lib/admin";
import { updateDefaultRoom, isDefaultRoom, deleteRoom } from "@/lib/rooms-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH /api/rooms/:id  { name?, description?, emoji?, image?, limit? }
// Admin-only: edit one of the default game rooms (stored as an override).
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isAdmin(session.user)) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }
  if (!isDefaultRoom(params.id)) {
    return NextResponse.json({ error: "Only default rooms are editable." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  try {
    const room = await updateDefaultRoom(params.id, {
      name: body.name,
      description: body.description,
      emoji: body.emoji,
      image: body.image,
      limit: body.limit,
    });
    if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
    return NextResponse.json({ room });
  } catch (e) {
    console.error("PATCH /api/rooms/[id] failed:", e);
    return NextResponse.json({ error: "Failed to save changes." }, { status: 502 });
  }
}

// DELETE /api/rooms/:id — admin-only: remove a custom (user-created) room.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isAdmin(session.user)) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }
  if (isDefaultRoom(params.id)) {
    return NextResponse.json({ error: "Default rooms can't be deleted." }, { status: 400 });
  }

  try {
    const ok = await deleteRoom(params.id);
    if (!ok) return NextResponse.json({ error: "Room not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/rooms/[id] failed:", e);
    return NextResponse.json({ error: "Failed to delete." }, { status: 502 });
  }
}
