"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { useVoice } from "./VoiceProvider";
import RoomIcon from "./RoomIcon";

interface ApiRoom {
  id: string;
  name: string;
  emoji: string;
  image: string | null;
  gradient: string;
  limit: number;
  code: string | null;
}

export default function VoiceMiniBar() {
  const v = useVoice();
  const pathname = usePathname();
  const router = useRouter();
  const [resumeRoom, setResumeRoom] = useState<ApiRoom | null>(null);

  // Resolve the remembered room's details for the "rejoin" prompt.
  useEffect(() => {
    if (v.activeRoom || !v.resumeRoomId) {
      setResumeRoom(null);
      return;
    }
    let cancelled = false;
    fetch("/api/rooms")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const room = (d.rooms ?? []).find((r: ApiRoom) => r.id === v.resumeRoomId);
        if (room) setResumeRoom(room);
        else v.leave(); // remembered room is gone/expired
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [v]);

  const onActiveRoomPage =
    v.activeRoom && pathname === `/voice/${v.activeRoom.id}`;

  // --- Connected (or connecting) to a room, but viewing another page ---
  if (v.activeRoom && !onActiveRoomPage && v.status !== "error") {
    const r = v.activeRoom;
    const total = v.peers.length + 1;
    return (
      <Bar emoji={r.emoji} image={r.image} gradient={r.gradient}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span
              className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                v.status === "connected" ? "bg-live-400 animate-pulse-soft" : "bg-amber-400"
              }`}
            />
            <span className="truncate">{r.name}</span>
          </div>
          <div className="text-xs text-slate-400">
            {v.status === "connected" ? `${total} in voice` : "Connecting…"}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <MiniIcon onClick={v.toggleMute} danger={v.muted} label={v.muted ? "Unmute" : "Mute"}>
            {v.muted ? <MicOff size={16} /> : <Mic size={16} />}
          </MiniIcon>
          <Link
            href={`/voice/${r.id}`}
            className="rounded-full bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/15"
          >
            Return
          </Link>
          <button
            onClick={v.leave}
            className="rounded-full bg-rose-500 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-600"
          >
            Leave
          </button>
        </div>
      </Bar>
    );
  }

  // --- Not connected, but we remember a room from before (post-reload) ---
  if (!v.activeRoom && resumeRoom) {
    const r = resumeRoom;
    return (
      <Bar emoji={r.emoji} image={r.image} gradient={r.gradient}>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{r.name}</div>
          <div className="text-xs text-slate-400">You were here</div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              v.join({ id: r.id, name: r.name, emoji: r.emoji, image: r.image, gradient: r.gradient, limit: r.limit, code: r.code });
              router.push(`/voice/${r.id}`);
            }}
            className="btn-primary px-4 py-2 text-sm"
          >
            Rejoin
          </button>
          <button
            onClick={v.leave}
            className="rounded-full bg-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/15"
          >
            Dismiss
          </button>
        </div>
      </Bar>
    );
  }

  return null;
}

function Bar({
  gradient,
  emoji,
  image,
  children,
}: {
  gradient: string;
  emoji: string;
  image: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(1.25rem_+_env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
      <div className="glass flex w-full max-w-md items-center gap-3 px-3 py-2.5 shadow-glow">
        <RoomIcon emoji={emoji} image={image} gradient={gradient} size="sm" />
        <div className="flex flex-1 items-center justify-between gap-3">{children}</div>
      </div>
    </div>
  );
}

function MiniIcon({
  children,
  onClick,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors ${
        danger ? "bg-rose-500/20 hover:bg-rose-500/30" : "bg-white/10 hover:bg-white/15"
      }`}
    >
      {children}
    </button>
  );
}
