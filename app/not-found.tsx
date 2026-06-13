import Link from "next/link";
import LogoMark from "@/components/LogoMark";

export const metadata = {
  title: "Page not found · Aalundo",
};

export default function NotFound() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-12rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-brand-600/25 blur-[120px] animate-float" />
        <div className="absolute bottom-[-8rem] right-[-4rem] h-72 w-72 rounded-full bg-accent-500/20 blur-[100px] animate-float [animation-delay:-4s]" />
      </div>

      <Link
        href="/"
        className="mb-12 flex items-center gap-2 text-lg font-bold tracking-tight"
      >
        <LogoMark className="h-8 w-8" /> Aalundo
      </Link>

      <p className="animate-fade-up text-7xl font-extrabold leading-none tracking-tight sm:text-8xl">
        <span className="text-gradient">404</span>
      </p>

      <h1 className="mt-6 animate-fade-up text-2xl font-extrabold tracking-tight [animation-delay:60ms] sm:text-3xl">
        This room has gone quiet.
      </h1>

      <p className="mt-3 max-w-md animate-fade-up text-slate-400 [animation-delay:120ms]">
        The page you&apos;re looking for doesn&apos;t exist, moved, or the voice
        room expired. Let&apos;s get you back to the conversation.
      </p>

      <div className="mt-9 flex animate-fade-up flex-col items-center gap-3 [animation-delay:180ms] sm:flex-row">
        <Link href="/voice" className="btn-primary px-7 py-3.5 text-base">
          Browse rooms →
        </Link>
        <Link href="/" className="btn-ghost px-7 py-3.5 text-base">
          Back home
        </Link>
      </div>
    </main>
  );
}
