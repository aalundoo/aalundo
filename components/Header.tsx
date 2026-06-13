import Link from "next/link";
import type { SessionData } from "@/lib/session";
import LogoMark from "./LogoMark";

export default function Header({ user }: { user: SessionData["user"] }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3.5 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold tracking-tight">
          <LogoMark className="h-7 w-7" />
          Aalundo
        </Link>

        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/profile"
            title="Profile"
            className="flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3 transition-colors hover:bg-white/10"
          >
            <Avatar name={user.name} avatar={user.avatar} />
            <span className="max-w-[32vw] truncate text-sm font-medium text-slate-200 sm:max-w-[12rem]">
              {user.name}
            </span>
          </Link>
          <a
            href="/api/auth/logout"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/10"
          >
            Logout
          </a>
        </div>
      </div>
    </header>
  );
}

function Avatar({ name, avatar }: { name: string; avatar: string | null }) {
  if (avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar}
        alt=""
        width={26}
        height={26}
        referrerPolicy="no-referrer"
        className="h-[26px] w-[26px] rounded-full ring-1 ring-white/10"
      />
    );
  }
  return (
    <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-xs font-bold ring-1 ring-white/10">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
