# 🎙️ Allundo — WebRTC voice rooms

Log in with Google and talk in real-time voice rooms, right in your browser.
8 game rooms out of the box, plus create-your-own rooms that auto-expire after a
day. Voice is peer-to-peer **WebRTC** — no media server, no external service, no
API keys.

## How it works

```
┌──────────────────────────────┐        ┌──────────────────────────────┐
│  Browser A                   │        │  Browser B                   │
│  • Google login (identity)   │        │                              │
│  • mic via getUserMedia      │◄──────►│   audio flows peer-to-peer   │
│  • RTCPeerConnection (mesh)  │  WebRTC │   (never touches the server) │
└──────────────┬───────────────┘        └───────────────┬──────────────┘
               │  offers / answers / ICE  +  presence    │
               └───────────────► server.mjs ◄────────────┘
                        WebSocket signaling (/ws)
                        + /api/rooms (registry, 24h expiry)
                        + Next.js app (pages, /api/auth/*)
```

- **`server.mjs`** is a custom Next.js server that also runs a WebSocket
  **signaling** server. It only relays the WebRTC handshake and tracks who's in
  each room — it never sees audio.
- Voice uses a **mesh** topology: every participant connects directly to every
  other. Great for small groups (~6–8 per room); no media server needed.
- **STUN** (Google public) handles NAT traversal. Behind strict/symmetric NATs
  you'd add a TURN server — see `ICE_CONFIG` in `lib/useVoiceRoom.ts`.

## Features

- 🎮 **8 default game rooms** (`lib/rooms-data.mjs`)
- ➕ **Create a room** via a floating button — auto-expires after 24h
- 🟢 Live **speaking indicators** (WebAudio level detection)
- 🎙️ Mute · 🔇 Deafen · 📺 **Picture-in-Picture** mini-view · Leave
- 🔐 **Google** sign-in (identity only)

## Project layout

```
server.mjs            Custom Next server + WebSocket signaling + room registry
app/
  page.tsx            Landing ("Continue with Google")
  voice/page.tsx      Lobby — room grid + floating Create button
  voice/[room]/       The call (pre-join, tiles, controls, PiP)
  api/auth/*          Google OAuth (login, callback, logout)
components/           Header, VoiceRoomsList, VoiceCall, CreateRoomFab
lib/
  google.ts           OAuth helpers
  session.ts          Signed JWT cookie session
  rooms-data.mjs      The 8 default rooms (shared with server.mjs)
  voice-rooms.ts      Room theming helpers
  useVoiceRoom.ts     WebRTC mesh client hook (peers, mic, speaking)
```

## Setup

### 1. Google OAuth credentials
1. https://console.cloud.google.com/apis/credentials
2. Configure the **OAuth consent screen** (External, add yourself as a test user).
3. **Create credentials → OAuth client ID → Web application**.
4. **Authorized redirect URIs** → add `http://localhost:3000/api/auth/callback`.
5. Copy the **Client ID** and **Client Secret**.

### 2. Environment
```bash
cp .env.example .env.local
```
Fill in `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and generate a secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # SESSION_SECRET
```

### 3. Run
```bash
npm install
npm run dev          # http://localhost:3000 (app + signaling on one port)
```

Open the site → **Continue with Google** → lobby → join a room → allow the mic.
To test two people, open a second browser/incognito and join the same room.

## Notes

- **Custom rooms are in-memory** — they reset if the server restarts (fine for
  24h-ephemeral rooms; swap in a DB/file for persistence).
- Microphones require a **secure context** — `localhost` works in dev; in
  production serve over **HTTPS**.
- Picture-in-Picture uses the canvas→video PiP API (Chromium/Safari); the button
  hides itself where unsupported.
# aalundo
