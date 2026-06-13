"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useVoiceRoom } from "@/lib/useVoiceRoom";
import type { AppUser } from "@/lib/google";
import VoiceMiniBar from "./VoiceMiniBar";

export interface RoomMeta {
  id: string;
  name: string;
  emoji: string;
  image: string | null;
  gradient: string;
  limit: number;
  code: string | null;
}

type VoiceState = ReturnType<typeof useVoiceRoom>;

interface VoiceContextValue extends VoiceState {
  user: AppUser | null;
  isAdmin: boolean;
  activeRoom: RoomMeta | null;
  resumeRoomId: string | null;
  join: (room: RoomMeta) => void;
  leave: () => void;
}

const VoiceContext = createContext<VoiceContextValue | null>(null);

export function useVoice(): VoiceContextValue {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error("useVoice must be used inside <VoiceProvider>");
  return ctx;
}

const STORAGE_KEY = "allundo:active-room";

// Holds the single voice connection for the whole app. Because it lives in the
// root layout, the connection survives page navigation — the user stays in the
// VC while browsing the site, and a remembered room lets them rejoin after a
// full reload.
export default function VoiceProvider({
  user,
  isAdmin = false,
  children,
}: {
  user: AppUser | null;
  isAdmin?: boolean;
  children: React.ReactNode;
}) {
  const [activeRoom, setActiveRoom] = useState<RoomMeta | null>(null);
  const [resumeRoomId, setResumeRoomId] = useState<string | null>(null);
  const voice = useVoiceRoom(activeRoom?.id ?? null, user);

  // On first load, recover the room we were in (for the rejoin prompt).
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setResumeRoomId(stored);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const join = useCallback((room: RoomMeta) => {
    setActiveRoom(room);
    setResumeRoomId(null);
    try {
      localStorage.setItem(STORAGE_KEY, room.id);
    } catch {
      /* ignore */
    }
  }, []);

  const leave = useCallback(() => {
    setActiveRoom(null);
    setResumeRoomId(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // Don't keep a dead room remembered after a hard failure.
  useEffect(() => {
    if (voice.status === "error") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }, [voice.status]);

  // Warn before closing/reloading the tab while connected to a voice channel.
  useEffect(() => {
    if (!activeRoom) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ""; // browsers show their native "Leave site?" prompt
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [activeRoom]);

  const value: VoiceContextValue = {
    ...voice,
    user,
    isAdmin,
    activeRoom,
    resumeRoomId,
    join,
    leave,
  };

  return (
    <VoiceContext.Provider value={value}>
      {children}
      {user && <VoiceMiniBar />}
    </VoiceContext.Provider>
  );
}
