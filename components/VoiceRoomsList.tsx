"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Link2, Check, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

const PER_PAGE = 20;
import { useVoice } from "./VoiceProvider";
import RoomIcon from "./RoomIcon";
import EditRoomModal from "./EditRoomModal";
import ConfirmDialog from "./ConfirmDialog";

interface Room {
  id: string;
  name: string;
  description: string;
  emoji: string;
  image: string | null;
  gradient: string;
  custom?: boolean;
  code: string | null;
  expiresAt?: number;
  count: number;
  limit: number;
}

export default function VoiceRoomsList() {
  const { isAdmin } = useVoice();
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [editing, setEditing] = useState<Room | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Room | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [page, setPage] = useState(1);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms", { cache: "no-store" });
      const data = await res.json();
      setRooms(data.rooms ?? []);
    } catch {
      /* keep last */
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [refresh]);

  async function joinByCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setResolving(true);
    setCodeError(null);
    try {
      const res = await fetch(`/api/rooms/by-code?code=${encodeURIComponent(code.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Invalid code.");
      router.push(`/voice/${data.id}`);
    } catch (e) {
      setCodeError(e instanceof Error ? e.message : "Invalid code.");
      setResolving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    await fetch(`/api/rooms/${pendingDelete.id}`, { method: "DELETE" });
    setDeleting(false);
    setPendingDelete(null);
    refresh();
  }

  const games = (rooms ?? []).filter((r) => !r.custom);
  const customs = (rooms ?? []).filter((r) => r.custom);

  const totalPages = Math.max(1, Math.ceil(customs.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedCustoms = customs.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  return (
    <div className="mt-10">
      {/* Join by code */}
      <form onSubmit={joinByCode} className="mb-8 flex flex-col gap-2 sm:flex-row">
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setCodeError(null);
          }}
          placeholder="Have a code? Enter it to join a room"
          className="flex-1 rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm tracking-widest outline-none ring-brand-500/40 placeholder:tracking-normal placeholder:text-slate-600 focus:ring-2"
        />
        <button type="submit" disabled={resolving || !code.trim()} className="btn-ghost px-5 py-3">
          {resolving ? "Joining…" : "Join with code"}
        </button>
      </form>
      {codeError && <p className="-mt-6 mb-6 text-sm text-rose-300">{codeError}</p>}

      <div className="flex items-center justify-between">
        <SectionHeading>✨ Lobby</SectionHeading>
        {isAdmin && <span className="chip bg-brand-500/15 text-brand-400">Admin</span>}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {games.length === 0
          ? [0, 1, 2, 3].map((i) => <div key={i} className="glass h-[5.5rem] animate-pulse-soft" />)
          : games.map((r) => (
              <RoomCard key={r.id} room={r} isAdmin={isAdmin} onEdit={() => setEditing(r)} onDelete={() => setPendingDelete(r)} />
            ))}
      </div>

      {customs.length > 0 && (
        <>
          <div className="mt-10 flex items-center justify-between">
            <SectionHeading>🌐 Community rooms</SectionHeading>
            <span className="text-xs text-slate-500">{customs.length} total</span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {pagedCustoms.map((r) => (
              <RoomCard key={r.id} room={r} isAdmin={isAdmin} onEdit={() => setEditing(r)} onDelete={() => setPendingDelete(r)} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm text-slate-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}

      {editing && (
        <EditRoomModal room={editing} onClose={() => setEditing(null)} onSaved={refresh} />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.name ?? ""}"?`}
        message="This room and its code will be removed for everyone. This can't be undone."
        confirmLabel="Delete room"
        danger
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function SectionHeading({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`text-xs font-semibold uppercase tracking-wider text-slate-400 ${className}`}>
      {children}
    </h2>
  );
}

function RoomCard({
  room,
  isAdmin,
  onEdit,
  onDelete,
}: {
  room: Room;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const active = room.count > 0;
  const full = room.count >= room.limit;
  const canEdit = isAdmin && !room.custom;
  const canDelete = isAdmin && room.custom;
  const [copied, setCopied] = useState(false);

  function shareRoom() {
    const url = `${window.location.origin}/voice/${room.id}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: room.name, text: `Join "${room.name}" on Aalundo`, url }).catch(() => {});
      return;
    }
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="group relative overflow-hidden glass p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20">
      <Link href={`/voice/${room.id}`} aria-label={`Join ${room.name}`} className="absolute inset-0 z-0" />
      <div className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${room.gradient} opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-40`} />

      <div className="pointer-events-none relative z-[1]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <RoomIcon emoji={room.emoji} image={room.image} gradient={room.gradient} size="md" />
            <div>
              <div className="font-semibold text-slate-100">{room.name}</div>
              <div className="text-sm text-slate-400">
                {room.custom && room.expiresAt
                  ? `Expires in ${hoursLeft(room.expiresAt)}`
                  : room.description}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`chip ${
                full ? "bg-rose-500/15 text-rose-300" : active ? "bg-live-500/15 text-live-400" : "bg-white/5 text-slate-400"
              }`}
            >
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${full ? "bg-rose-400" : active ? "bg-live-400 animate-pulse-soft" : "bg-slate-600"}`} />
              {full ? "Full" : `${room.count}/${room.limit}`}
            </span>
            <IconBtn onClick={shareRoom} label={copied ? "Link copied!" : `Share ${room.name}`} active={copied}>
              {copied ? <Check size={14} /> : <Link2 size={14} />}
            </IconBtn>
            {canEdit && (
              <IconBtn onClick={onEdit} label={`Edit ${room.name}`}>
                <Pencil size={14} />
              </IconBtn>
            )}
            {canDelete && (
              <IconBtn onClick={onDelete} label={`Delete ${room.name}`} danger>
                <Trash2 size={14} />
              </IconBtn>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {room.code ? (
              <>Code <span className="font-mono tracking-widest text-slate-400">{room.code}</span></>
            ) : active ? "Join the conversation" : "Be the first to hop in"}
          </span>
          <span className="text-sm font-medium text-brand-400 opacity-0 transition-opacity group-hover:opacity-100">
            Join →
          </span>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  danger,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label}
      className={`pointer-events-auto flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${
        active
          ? "border-live-500/40 bg-live-500/20 text-live-400"
          : danger
            ? "border-white/10 bg-white/5 text-slate-300 hover:border-rose-400/40 hover:bg-rose-500/20 hover:text-rose-300"
            : "border-white/10 bg-white/5 text-slate-300 hover:border-brand-400/40 hover:bg-brand-500/20 hover:text-brand-400"
      }`}
    >
      {children}
    </button>
  );
}

function hoursLeft(ts: number): string {
  const h = Math.max(0, Math.round((ts - Date.now()) / 3_600_000));
  return h <= 1 ? "under an hour" : `${h}h`;
}
