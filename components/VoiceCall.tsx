"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Volume2, VolumeX, PhoneOff, Link2, Search, Radio } from "lucide-react";
import { roomTheme } from "@/lib/voice-rooms";
import { useVoice } from "./VoiceProvider";
import RoomIcon from "./RoomIcon";

interface RoomInfo {
  id: string;
  name: string;
  emoji: string;
  image: string | null;
  gradient: string;
  custom?: boolean;
  code: string | null;
  expiresAt?: number;
  count: number;
  limit: number;
}

export default function VoiceCall({ roomId }: { roomId: string }) {
  const router = useRouter();
  const v = useVoice();
  const [info, setInfo] = useState<RoomInfo | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/rooms", { cache: "no-store" });
        const data = await res.json();
        const found = (data.rooms ?? []).find((r: RoomInfo) => r.id === roomId);
        if (found) setInfo(found);
        else setNotFound(true);
      } catch {
        setNotFound(true);
      }
    })();
  }, [roomId]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-md px-6 pt-16 text-center">
        <Search className="mx-auto text-slate-400" size={48} />
        <h1 className="mt-4 text-2xl font-bold">Room not found</h1>
        <p className="mt-2 text-slate-400">This room doesn&apos;t exist or has expired.</p>
        <button onClick={() => router.push("/voice")} className="btn-primary mt-6">
          Back to lobby
        </button>
      </div>
    );
  }

  const theme = roomTheme(roomId);
  const name = info?.name ?? "Voice room";
  const emoji = info?.emoji ?? theme.emoji;
  const image = info?.image ?? null;
  const gradient = info?.gradient ?? theme.gradient;
  const limit = info?.limit ?? 20;
  const code = info?.code ?? null;

  const connectedHere = v.activeRoom?.id === roomId;

  if (connectedHere && v.status === "error") {
    return (
      <div className="mx-auto max-w-md px-6 pt-16 text-center">
        <Radio className="mx-auto text-slate-400" size={48} />
        <h1 className="mt-4 text-2xl font-bold">Couldn&apos;t connect</h1>
        <p className="mt-2 text-slate-400">{v.error}</p>
        <button onClick={() => { v.leave(); router.push("/voice"); }} className="btn-primary mt-6">
          Back to lobby
        </button>
      </div>
    );
  }

  if (!connectedHere) {
    return (
      <PreJoin
        name={name}
        emoji={emoji}
        image={image}
        gradient={gradient}
        count={info?.count ?? 0}
        limit={limit}
        expiresAt={info?.expiresAt}
        onJoin={() => v.join({ id: roomId, name, emoji, image, gradient, limit, code })}
      />
    );
  }

  return (
    <RoomStage
      name={name}
      emoji={emoji}
      image={image}
      gradient={gradient}
      limit={limit}
      code={code}
      onLeave={() => { v.leave(); router.push("/voice"); }}
    />
  );
}

function PreJoin({
  name, emoji, image, gradient, count, limit, expiresAt, onJoin,
}: {
  name: string; emoji: string; image: string | null; gradient: string;
  count: number; limit: number; expiresAt?: number; onJoin: () => void;
}) {
  const full = count >= limit;
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 pt-10 text-center">
      <div className="animate-fade-up">
        <RoomIcon emoji={emoji} image={image} gradient={gradient} size="xl" glow />
      </div>
      <h1 className="mt-6 animate-fade-up text-3xl font-extrabold tracking-tight [animation-delay:60ms]">{name}</h1>
      <p className="mt-2 animate-fade-up text-slate-400 [animation-delay:120ms]">
        {count > 0
          ? `${count} of ${limit} ${count === 1 ? "person" : "people"} in voice`
          : `Be the first one in · up to ${limit}`}
        {expiresAt ? " · expires in " + hoursLeft(expiresAt) : ""}
      </p>
      <button onClick={onJoin} disabled={full} className="btn-primary mt-8 inline-flex w-full items-center justify-center gap-2 py-4 text-base animate-fade-up [animation-delay:180ms]">
        <Mic size={18} /> {full ? "Room is full" : "Join voice"}
      </button>
      <p className="mt-3 text-xs text-slate-500">
        {full ? "Try again when someone leaves." : "We'll ask for microphone access to connect you."}
      </p>
    </div>
  );
}

function RoomStage({
  name, emoji, image, gradient, limit, code, onLeave,
}: {
  name: string; emoji: string; image: string | null; gradient: string;
  limit: number; code: string | null; onLeave: () => void;
}) {
  const v = useVoice();
  const me = v.user!;
  const total = v.peers.length + 1;
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  function copyCode() {
    if (!code) return;
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  function shareLink() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: name, text: `Join "${name}" on Aalundo`, url }).catch(() => {});
      return;
    }
    navigator.clipboard?.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1500);
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-6 pb-40">
      <div className="flex flex-col items-center pt-4 text-center">
        <RoomIcon emoji={emoji} image={image} gradient={gradient} size="lg" glow />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{name}</h1>
        <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
          <span className={`inline-block h-2 w-2 rounded-full ${v.status === "connected" ? "bg-live-400 animate-pulse-soft" : "bg-amber-400"}`} />
          {v.status === "connected" ? "Connected" : "Connecting…"}
          <span className="text-slate-600">·</span>
          {total}/{limit} in voice
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {code && (
            <button
              onClick={copyCode}
              title="Copy code to share"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:bg-white/10"
            >
              <span className="text-slate-500">Code</span>
              <span className="font-mono tracking-widest">{code}</span>
              <span className="text-xs text-brand-400">{copied ? "Copied!" : "Copy"}</span>
            </button>
          )}
          <button
            onClick={shareLink}
            title="Share a link to this room"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:bg-white/10"
          >
            <Link2 size={15} />
            {copiedLink ? "Link copied!" : "Share link"}
          </button>
        </div>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
        <Tile name={me.name} avatar={me.avatar} speaking={!v.muted && !!v.speaking["self"]} muted={v.muted} isSelf />
        {v.peers.map((p) => (
          <Tile key={p.id} name={p.user.name} avatar={p.user.avatar} speaking={!p.muted && !!v.speaking[p.id]} muted={p.muted} />
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(1.25rem_+_env(safe-area-inset-bottom))] z-30 flex justify-center px-4 sm:bottom-7">
        <div className="glass flex items-center gap-3 px-4 py-3 shadow-glow">
          <CtrlBtn onClick={v.toggleMute} label={v.muted ? "Unmute" : "Mute"} danger={v.muted} active={!v.muted}>
            {v.muted ? <MicOff size={20} /> : <Mic size={20} />}
          </CtrlBtn>
          <CtrlBtn onClick={v.toggleDeafen} label={v.deafened ? "Undeafen" : "Deafen"} danger={v.deafened} active={!v.deafened}>
            {v.deafened ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </CtrlBtn>
          <button
            onClick={onLeave}
            className="flex h-14 items-center gap-2 rounded-full bg-rose-500 px-6 font-semibold text-white transition-all hover:bg-rose-600 active:scale-95"
          >
            <PhoneOff size={20} /> Leave
          </button>
        </div>
      </div>
    </div>
  );
}

function Tile({
  name, avatar, speaking, muted, isSelf,
}: {
  name: string; avatar: string | null; speaking: boolean; muted: boolean; isSelf?: boolean;
}) {
  return (
    <div className="flex animate-fade-up flex-col items-center gap-3">
      <div className="relative">
        <div className={`rounded-full p-1 transition-all duration-200 ${speaking ? "shadow-speak scale-105" : ""}`}>
          <div className="relative h-20 w-20 overflow-hidden rounded-full ring-1 ring-white/10">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-500 to-accent-500 text-2xl font-bold">
                {name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          {speaking && <span className="absolute inset-0 rounded-full animate-ring" />}
        </div>
        <span className={`absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-ink-950 ${muted ? "bg-rose-500" : "bg-ink-700"}`}>
          {muted ? <MicOff size={13} /> : <Mic size={13} />}
        </span>
      </div>
      <span className="max-w-[7rem] truncate text-sm font-medium text-slate-200">
        {name}
        {isSelf && <span className="text-slate-500"> (you)</span>}
      </span>
    </div>
  );
}

function CtrlBtn({
  children, onClick, label, active, danger,
}: {
  children: React.ReactNode; onClick: () => void; label: string; active: boolean; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`icon-btn ${
        danger
          ? "border-rose-500/40 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
          : active
            ? "border-brand-400/40 bg-brand-500/20 text-brand-400"
            : ""
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
