"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Minus } from "lucide-react";
import { MAX_LIMIT as MAX } from "@/lib/rooms-data.mjs";

export default function CreateRoomFab() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [hours, setHours] = useState(24);
  const [limit, setLimit] = useState(8);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), hours, limit, image: image.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't create the room.");
      router.push(`/voice/${data.room.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the room.");
      setBusy(false);
    }
  }

  return (
    <>
      {/* Floating action button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Create a room"
        className="group fixed bottom-7 right-7 z-40 flex items-center gap-0 overflow-hidden rounded-full bg-gradient-to-br from-brand-500 to-accent-500 px-5 py-5 text-white shadow-glow transition-all duration-300 hover:gap-2 hover:pr-6 active:scale-95"
      >
        <Plus size={22} strokeWidth={2.5} />
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold transition-all duration-300 group-hover:max-w-[8rem]">
          Create room
        </span>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setOpen(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={create}
            className="glass w-full max-w-md animate-fade-up p-6"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-xl shadow-glow">
                🎧
              </div>
              <div>
                <h2 className="text-lg font-bold">Create a room</h2>
                <p className="text-xs text-slate-400">Pick how long it stays open</p>
              </div>
            </div>

            <label className="mt-5 block text-sm font-medium text-slate-300">
              Room name
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder="e.g. Friday Night Squad"
              className="mt-2 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm outline-none ring-brand-500/40 placeholder:text-slate-600 focus:ring-2"
            />

            <label className="mt-4 block text-sm font-medium text-slate-300">
              Icon image URL <span className="text-slate-500">(optional)</span>
            </label>
            <input
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://…"
              className="mt-2 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm outline-none ring-brand-500/40 placeholder:text-slate-600 focus:ring-2"
            />
            {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}

            <label className="mt-5 block text-sm font-medium text-slate-300">
              Expires after
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[6, 12, 24].map((h) => {
                const selected = hours === h;
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHours(h)}
                    className={`rounded-xl border py-2.5 text-sm font-semibold transition-all ${
                      selected
                        ? "border-brand-400/60 bg-brand-500/20 text-white shadow-glow"
                        : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {h}h
                  </button>
                );
              })}
            </div>

            <label className="mt-5 block text-sm font-medium text-slate-300">
              Member limit
            </label>
            <div className="mt-2 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <button
                type="button"
                aria-label="Decrease limit"
                onClick={() => setLimit((n) => Math.max(2, n - 1))}
                disabled={limit <= 2}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-40"
              >
                <Minus size={18} />
              </button>
              <div className="text-center">
                <div className="text-2xl font-extrabold tabular-nums">{limit}</div>
                <div className="text-[11px] text-slate-500">max {MAX} members</div>
              </div>
              <button
                type="button"
                aria-label="Increase limit"
                onClick={() => setLimit((n) => Math.min(MAX, n + 1))}
                disabled={limit >= MAX}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-40"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="mt-5 flex gap-2">
              <button type="submit" disabled={busy} className="btn-primary flex-1 py-3">
                {busy ? "Creating…" : "Create & join"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-ghost px-5 py-3"
              >
                Cancel
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Anyone with the link can join. The room disappears automatically
              after {hours} hours.
            </p>
          </form>
        </div>
      )}
    </>
  );
}
