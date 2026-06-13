import type { Metadata } from "next";
import Link from "next/link";
import LogoMark from "@/components/LogoMark";
import TermsContent from "@/components/TermsContent";

export const metadata: Metadata = {
  title: "Disclaimer & Terms · Aalundo",
  description: "Terms of use and liability disclaimer for Aalundo voice rooms.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
        <LogoMark className="h-8 w-8" /> Aalundo
      </Link>
      <h1 className="mt-8 text-3xl font-extrabold tracking-tight">Disclaimer &amp; Terms</h1>
      <div className="mt-6">
        <TermsContent />
      </div>
      <Link href="/" className="mt-10 inline-block text-sm text-brand-400 hover:underline">
        ← Back home
      </Link>
    </main>
  );
}
