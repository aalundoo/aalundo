"use client";

import { useEffect, useState } from "react";
import { Plus, Minus } from "lucide-react";
import { MAX_LIMIT as MAX } from "@/lib/rooms-data.mjs";
import RoomIcon from "./RoomIcon";

interface EditableRoom {
  id: string;
  name: string;
  description: string;
  emoji: string;
  image: string | null;
  gradient: string;
  limit: number;
}

export default function EditRoomModal({
  room,
  onClose,
  onSaved,
}: {
  room: EditableRoom;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description);
  const [emoji, setEmoji] = useState(room.emoji);
  const [image, setImage] = useState(room.image ?? "");
  const [limit, setLimit] = useState(room.limit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${room.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, emoji, image: image.trim() || null, limit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save.");
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={save}
        className="glass w-full max-w-md animate-fade-up p-6"
      >
        <div className="flex items-center gap-3">
          <RoomIcon emoji={emoji} image={image.trim() || null} gradient={room.gradient} size="md" />
          <div>
            <h2 className="text-lg font-bold">Edit room</h2>
            <p className="text-xs text-slate-400">Admin · changes apply for everyone</p>
          </div>
        </div>

        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className={inputCls} />
        </Field>
        <Field label="Description">
          <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={80} className={inputCls} />
        </Field>

        <div className="mt-4 grid grid-cols-[5rem,1fr] gap-3">
          <div>
            <span className="text-sm font-medium text-slate-300">Emoji</span>
            <input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={8} className={`${inputCls} mt-2 text-center`} />
          </div>
          <div>
            <span className="text-sm font-medium text-slate-300">Icon image URL</span>
            <input
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://…  (overrides emoji)"
              className={`${inputCls} mt-2`}
            />
          </div>
        </div>

        <label className="mt-4 block text-sm font-medium text-slate-300">Member limit</label>
        <div className="mt-2 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <button type="button" onClick={() => setLimit((n) => Math.max(2, n - 1))} disabled={limit <= 2} className={stepCls}>
            <Minus size={18} />
          </button>
          <div className="text-center">
            <div className="text-2xl font-extrabold tabular-nums">{limit}</div>
            <div className="text-[11px] text-slate-500">max {MAX}</div>
          </div>
          <button type="button" onClick={() => setLimit((n) => Math.min(MAX, n + 1))} disabled={limit >= MAX} className={stepCls}>
            <Plus size={18} />
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button type="submit" disabled={busy} className="btn-primary flex-1 py-3">
            {busy ? "Saving…" : "Save changes"}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost px-5 py-3">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm outline-none ring-brand-500/40 placeholder:text-slate-600 focus:ring-2";
const stepCls =
  "flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-lg font-bold text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <label className="block text-sm font-medium text-slate-300">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
