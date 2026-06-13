import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Header from "@/components/Header";
import VoiceRoomsList from "@/components/VoiceRoomsList";
import CreateRoomFab from "@/components/CreateRoomFab";
import DisclaimerButton from "@/components/DisclaimerButton";

export const dynamic = "force-dynamic";

export default async function LobbyPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const name = session.user.name;

  return (
    <>
      <Header user={session.user} />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="animate-fade-up">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Welcome back, <span className="text-gradient">{name}</span>
          </h1>
          <p className="mt-2 text-slate-400">
            Pick a room and start talking — casual chats, big ideas, study
            time, or game night.
          </p>
        </div>
        <VoiceRoomsList />
        <div className="mt-14 flex justify-center">
          <DisclaimerButton />
        </div>
      </main>
      <CreateRoomFab />
    </>
  );
}
