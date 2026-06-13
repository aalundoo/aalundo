"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Profile {
  id: string;
  name: string;
  googleName: string;
  avatar: string | null;
  email: string | null;
  nameChangedAt: number | null;
  canChangeName: boolean;
  nextChangeAt: number | null;
}

export default function ProfileForm() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cooldownDays, setCooldownDays] = useState(60);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function load() {
    const res = await fetch("/api/profile", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setProfile(data.profile);
    setIsAdmin(data.isAdmin);
    setCooldownDays(data.cooldownDays);
    setName(data.profile.name);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't save.");
      setProfile(data.profile);
      setSaved(true);
      router.refresh(); // updates the name in the header
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  }

  if (!profile) return <p className="mt-8 text-slate-500">Loading…</p>;

  const changed = name.trim() !== profile.name;

  return (
    <div className="mt-6 space-y-6">
      <div className="glass flex items-center gap-4 p-5">
        {profile.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar}
            alt=""
            referrerPolicy="no-referrer"
            className="h-16 w-16 rounded-full ring-1 ring-white/10"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-2xl font-bold">
            {profile.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-lg font-semibold">{profile.name}</span>
            {isAdmin && (
              <span className="chip bg-brand-500/15 text-brand-400">Admin</span>
            )}
          </div>
          {profile.email && (
            <div className="truncate text-sm text-slate-400">{profile.email}</div>
          )}
        </div>
      </div>

      <form onSubmit={save} className="glass p-5">
        <label className="text-sm font-medium text-slate-300">Display name</label>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          maxLength={32}
          disabled={!profile.canChangeName}
          className="mt-2 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm outline-none ring-brand-500/40 placeholder:text-slate-600 focus:ring-2 disabled:opacity-60"
        />

        {profile.canChangeName ? (
          <p className="mt-2 text-xs text-slate-500">
            You can change your name once every {cooldownDays} days, so choose
            carefully.
          </p>
        ) : (
          <p className="mt-2 text-xs text-amber-300/80">
            You changed your name recently. You can change it again on{" "}
            {profile.nextChangeAt
              ? new Date(profile.nextChangeAt).toLocaleDateString()
              : "—"}
            .
          </p>
        )}

        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
        {saved && <p className="mt-3 text-sm text-live-400">Saved ✓</p>}

        <button
          type="submit"
          disabled={busy || !profile.canChangeName || !changed || name.trim().length < 2}
          className="btn-primary mt-4 px-5 py-3"
        >
          {busy ? "Saving…" : "Save name"}
        </button>
      </form>
    </div>
  );
}
