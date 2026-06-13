import { ImageResponse } from "next/og";
import { getRoom } from "@/lib/rooms-store";

export const runtime = "nodejs";
export const alt = "Aalundo voice room";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Generated preview image shown when a room link is shared.
export default async function Image({ params }: { params: { room: string } }) {
  const room = await getRoom(params.room).catch(() => null);
  const name = room?.name ?? "Voice room";
  const description = room?.description ?? "Live voice on Aalundo";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: "90px",
          justifyContent: "center",
          backgroundColor: "#0c0c12",
          backgroundImage:
            "linear-gradient(135deg, rgba(124,58,237,0.55) 0%, rgba(12,12,18,0.1) 45%, rgba(217,70,239,0.5) 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              backgroundImage: "linear-gradient(135deg,#7c3aed,#d946ef)",
            }}
          />
          <div style={{ fontSize: "36px", fontWeight: 700, color: "#c4b5fd" }}>Aalundo</div>
        </div>

        <div style={{ marginTop: "44px", fontSize: "92px", fontWeight: 800, lineHeight: 1.05 }}>
          {name}
        </div>
        <div style={{ marginTop: "26px", fontSize: "42px", color: "#cbd5e1" }}>{description}</div>
        <div style={{ marginTop: "52px", fontSize: "30px", color: "#94a3b8" }}>
          Live voice room · tap to join the conversation
        </div>
      </div>
    ),
    { ...size },
  );
}
