import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getRoom } from "@/lib/rooms-store";
import { roomTheme } from "@/lib/voice-rooms";
import LogoMark from "@/components/LogoMark";
import RoomIcon from "@/components/RoomIcon";
import VoiceCall from "@/components/VoiceCall";

export const dynamic = "force-dynamic";

// Per-channel metadata so shared links unfurl with the room's name/description.
export async function generateMetadata({
  params,
}: {
  params: { room: string };
}): Promise<Metadata> {
  const room = await getRoom(params.room).catch(() => null);
  if (!room) return { title: "Room not found · Aalundo" };

  const title = `${room.name} · Aalundo`;
  const description = room.description || "Join this live voice room on Aalundo.";
  // Use the room's own icon image for link previews when it has one; otherwise
  // fall back to the generated opengraph-image route.
  const images = room.image ? [room.image] : undefined;
  return {
    title,
    description,
    openGraph: { title, description, type: "website", ...(images && { images }) },
    twitter: { card: "summary_large_image", title, description, ...(images && { images }) },
  };
}

export default async function VoiceRoomPage({
  params,
}: {
  params: { room: string };
}) {
  const session = await getSession();

  // Logged-out: show a public preview (and let unfurlers read the metadata)
  // instead of redirecting away.
  if (!session) {
    const room = await getRoom(params.room).catch(() => null);
    const theme = roomTheme(params.room);
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-6 text-center">
        <Link href="/" className="mb-10 flex items-center gap-2 font-bold tracking-tight">
          <LogoMark className="h-8 w-8" /> Aalundo
        </Link>

        {room ? (
          <>
            <RoomIcon emoji={room.emoji} image={room.image} gradient={room.gradient} size="xl" glow />
            <h1 className="mt-6 text-3xl font-extrabold tracking-tight">{room.name}</h1>
            <p className="mt-2 text-slate-400">{room.description}</p>
            <p className="mt-1 text-sm text-slate-500">
              {room.count > 0 ? `${room.count} in voice now` : "Be the first one in"}
            </p>
          </>
        ) : (
          <>
            <RoomIcon emoji={theme.emoji} image={null} gradient={theme.gradient} size="xl" glow />
            <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Voice room</h1>
            <p className="mt-2 text-slate-400">Sign in to join the conversation.</p>
          </>
        )}

        <Link href="/api/auth/login" className="btn-primary mt-8 w-full py-4 text-base">
          Continue with Google to join
        </Link>
        <Link href="/" className="mt-3 text-sm text-slate-500 hover:text-slate-300">
          Back home
        </Link>
      </main>
    );
  }

  return (
    <main className="relative min-h-[100dvh]">
      <div className="mx-auto max-w-4xl px-6 py-6">
        <Link href="/voice" className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-200">
          ← Lobby
        </Link>
      </div>
      <VoiceCall roomId={params.room} />
    </main>
  );
}
