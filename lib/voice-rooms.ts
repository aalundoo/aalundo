import { DEFAULT_ROOMS, customGradient } from "./rooms-data.mjs";

export interface VoiceRoom {
  id: string;
  name: string;
  description: string;
  emoji: string;
  gradient: string;
  custom?: boolean;
  expiresAt?: number;
}

export const VOICE_ROOMS: VoiceRoom[] = DEFAULT_ROOMS;

export function getDefaultRoom(id: string): VoiceRoom | undefined {
  return VOICE_ROOMS.find((r) => r.id === id);
}

// Theme a room by id even if it's a custom one we don't have metadata for yet.
export function roomTheme(id: string): { emoji: string; gradient: string } {
  const d = getDefaultRoom(id);
  if (d) return { emoji: d.emoji, gradient: d.gradient };
  return { emoji: "🎧", gradient: customGradient(id) };
}
