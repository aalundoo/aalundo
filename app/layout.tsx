import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getSession } from "@/lib/session";
import { isAdmin } from "@/lib/admin";
import VoiceProvider from "@/components/VoiceProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"),
  title: "Aalundo — Live voice rooms for every conversation",
  description:
    "Casual chats, business brainstorms, study sessions, game nights — drop into a live voice room in your browser. No app required.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#08080c",
  // Let content extend under the notch/home indicator so we can pad with the
  // env(safe-area-inset-*) values on fixed bars.
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const admin = isAdmin(session?.user);

  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-[100dvh] font-sans">
        <VoiceProvider user={session?.user ?? null} isAdmin={admin}>
          {children}
        </VoiceProvider>
      </body>
    </html>
  );
}
