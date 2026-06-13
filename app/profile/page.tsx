import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import Header from "@/components/Header";
import ProfileForm from "@/components/ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <>
      <Header user={session.user} />
      <main className="mx-auto max-w-xl px-6 py-10">
        <Link href="/voice" className="text-sm text-slate-400 hover:text-slate-200">
          ← Lobby
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Profile</h1>
        <ProfileForm />
      </main>
    </>
  );
}
