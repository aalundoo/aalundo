import Link from "next/link";
import { getSession } from "@/lib/session";
import LogoMark from "@/components/LogoMark";
import DisclaimerButton from "@/components/DisclaimerButton";

export const dynamic = "force-dynamic";

const TOPICS = [
  { emoji: "☕", label: "Tea talk" },
  { emoji: "💡", label: "Business" },
  { emoji: "🚀", label: "Startups" },
  { emoji: "📚", label: "Study" },
  { emoji: "🎵", label: "Music" },
  { emoji: "🎮", label: "Gaming" },
];

export default async function LandingPage() {
  const session = await getSession();
  const isLoggedIn = !!session;

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-12rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-brand-600/25 blur-[120px] animate-float" />
        <div className="absolute right-[-6rem] top-40 h-72 w-72 rounded-full bg-accent-500/20 blur-[100px] animate-float [animation-delay:-3s]" />
        <div className="absolute bottom-[-8rem] left-10 h-72 w-72 rounded-full bg-live-500/15 blur-[100px] animate-float [animation-delay:-5s]" />
      </div>

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <LogoMark className="h-8 w-8" /> Aalundo
        </div>
        {isLoggedIn ? (
          <Link href="/voice" className="btn-ghost py-2">
            Enter lobby →
          </Link>
        ) : (
          <Link href="/api/auth/login" className="btn-ghost py-2">
            Login
          </Link>
        )}
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-6 inline-flex animate-fade-up items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-slate-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-live-500" />
          </span>
          Live voice rooms for every conversation
        </div>

        <h1 className="animate-fade-up text-5xl font-extrabold leading-[1.05] tracking-tight [animation-delay:60ms] sm:text-7xl">
          Tea talks to big ideas.
          <br />
          <span className="text-gradient">All out loud.</span>
        </h1>

        <p className="mt-6 max-w-xl animate-fade-up text-lg text-slate-400 [animation-delay:120ms]">
          Casual chats, business brainstorms, study sessions, game nights — drop
          into a live voice room and just start talking. No downloads, no
          friction.
        </p>

        {/* topic chips */}
        <div className="mt-7 flex animate-fade-up flex-wrap items-center justify-center gap-2 [animation-delay:150ms]">
          {TOPICS.map((t) => (
            <span
              key={t.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300"
            >
              <span>{t.emoji}</span> {t.label}
            </span>
          ))}
        </div>

        <div className="mt-10 flex animate-fade-up flex-col items-center gap-3 [animation-delay:200ms] sm:flex-row">
          {isLoggedIn ? (
            <Link href="/voice" className="btn-primary px-7 py-3.5 text-base">
              Enter the lobby →
            </Link>
          ) : (
            <Link href="/api/auth/login" className="btn-primary px-7 py-3.5 text-base">
              <GoogleMark /> Continue with Google
            </Link>
          )}
          <span className="text-sm text-slate-500">Free · works on any device</span>
        </div>

        <div className="mt-20 grid w-full animate-fade-up gap-4 [animation-delay:260ms] sm:grid-cols-3">
          {[
            { icon: "⚡", t: "Instant", d: "Click a room, you're live in under a second." },
            { icon: "🎧", t: "Crystal clear", d: "Low-latency HD audio, peer-to-peer." },
            { icon: "🪄", t: "Make your own", d: "Spin up a private room that expires on its own." },
          ].map((f) => (
            <div key={f.t} className="glass p-5 text-left">
              <div className="text-2xl">{f.icon}</div>
              <div className="mt-3 font-semibold">{f.t}</div>
              <div className="mt-1 text-sm text-slate-400">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-6 py-8 text-center text-sm text-slate-600">
        <DisclaimerButton />
      </footer>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 0 1 0-24c3 0 5.8 1.2 7.9 3l5.7-5.7A20 20 0 1 0 24 44a20 20 0 0 0 19.6-23.5Z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.2 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7Z" />
      <path fill="#4CAF50" d="M24 44a20 20 0 0 0 13.5-5.2l-6.2-5.3A12 12 0 0 1 12.7 28l-6.6 5.1A20 20 0 0 0 24 44Z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C39.9 36.5 44 31 44 24a20 20 0 0 0-.4-3.5Z" />
    </svg>
  );
}
