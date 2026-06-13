"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Ably from "ably";

export interface PeerUser {
  id: string;
  name: string;
  avatar: string | null;
}

export interface Peer {
  id: string;
  user: PeerUser;
  muted: boolean;
}

type Status = "idle" | "connecting" | "connected" | "error";

// Fallback used if /api/ice can't be reached. STUN-only works on the same
// network but not across strict/symmetric NATs — configure TURN (TURN_* env)
// so /api/ice can hand out a relay.
const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const SPEAK_THRESHOLD = 0.045;

// Signaling runs over an Ably realtime channel (browser <-> Ably), so it works
// on serverless hosts and across instances. Each browser connection is one
// presence member; peers are identified by their Ably connectionId.
export function useVoiceRoom(roomId: string | null, user: PeerUser | null) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [speaking, setSpeaking] = useState<Record<string, boolean>>({});
  // Whether we have a working local mic. When false the user is in listen-only
  // mode — they can hear everyone but can't transmit.
  const [hasMic, setHasMic] = useState(false);
  // Bumping this re-runs the connect effect — lets the user re-request mic
  // access (or recover from a transient failure) without reloading the page.
  const [retryNonce, setRetryNonce] = useState(0);

  const ablyRef = useRef<Ably.Realtime | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const membersRef = useRef<Map<string, PeerUser>>(new Map());
  const selfIdRef = useRef<string>("self"); // our Ably connectionId once connected
  const acRef = useRef<AudioContext | null>(null);
  const analysersRef = useRef<Map<string, AnalyserNode>>(new Map());
  const deafenedRef = useRef(false);
  const iceConfigRef = useRef<RTCConfiguration>(ICE_CONFIG);
  const userRef = useRef<PeerUser | null>(user);
  userRef.current = user;

  // ---- channel publish helpers --------------------------------------------
  function sendSignal(to: string, data: unknown) {
    channelRef.current?.publish("signal", { to, from: selfIdRef.current, data }).catch(() => {});
  }
  function sendState(isMuted: boolean) {
    channelRef.current?.publish("state", { from: selfIdRef.current, muted: isMuted }).catch(() => {});
  }

  // ---- speaking detection -------------------------------------------------
  useEffect(() => {
    let raf = 0;
    const buf = new Uint8Array(1024);
    let last: Record<string, boolean> = {};
    const tick = () => {
      const next: Record<string, boolean> = {};
      let changed = false;
      for (const [id, an] of analysersRef.current) {
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        next[id] = Math.sqrt(sum / buf.length) > SPEAK_THRESHOLD;
        if (last[id] !== next[id]) changed = true;
      }
      if (changed || Object.keys(next).length !== Object.keys(last).length) {
        last = next;
        setSpeaking(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  function attachAnalyser(id: string, stream: MediaStream) {
    if (!acRef.current) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      acRef.current = new Ctor();
    }
    const ac = acRef.current;
    const src = ac.createMediaStreamSource(stream);
    const an = ac.createAnalyser();
    an.fftSize = 2048;
    src.connect(an);
    analysersRef.current.set(id, an);
  }

  function createPeer(peerId: string, peerUser: PeerUser, initiator: boolean): RTCPeerConnection {
    const existing = pcsRef.current.get(peerId);
    if (existing) return existing;

    const pc = new RTCPeerConnection(iceConfigRef.current);
    pcsRef.current.set(peerId, pc);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));
    } else {
      // Listen-only: nothing to send, but still negotiate an audio m-line so we
      // receive everyone else.
      pc.addTransceiver("audio", { direction: "recvonly" });
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal(peerId, { candidate: e.candidate });
    };

    pc.ontrack = (e) => {
      const stream = e.streams[0];
      let el = audiosRef.current.get(peerId);
      if (!el) {
        el = new Audio();
        el.autoplay = true;
        el.muted = deafenedRef.current;
        audiosRef.current.set(peerId, el);
      }
      el.srcObject = stream;
      el.play().catch(() => {});
      attachAnalyser(peerId, stream);
    };

    setPeers((prev) =>
      prev.some((p) => p.id === peerId) ? prev : [...prev, { id: peerId, user: peerUser, muted: false }],
    );

    if (initiator) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer).then(() => offer))
        .then((offer) => sendSignal(peerId, { sdp: offer }))
        .catch((err) => console.error("offer failed:", err));
    }
    return pc;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function onSignal(from: string, data: any) {
    let pc = pcsRef.current.get(from);
    if (data.sdp) {
      if (!pc) {
        const u = membersRef.current.get(from) ?? { id: from, name: "Guest", avatar: null };
        pc = createPeer(from, u, false);
      }
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      if (data.sdp.type === "offer") {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal(from, { sdp: answer });
      }
    } else if (data.candidate && pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch {
        /* candidate may arrive before remote desc */
      }
    }
  }

  function removePeer(peerId: string) {
    pcsRef.current.get(peerId)?.close();
    pcsRef.current.delete(peerId);
    const el = audiosRef.current.get(peerId);
    if (el) {
      el.srcObject = null;
      audiosRef.current.delete(peerId);
    }
    analysersRef.current.delete(peerId);
    membersRef.current.delete(peerId);
    setPeers((prev) => prev.filter((p) => p.id !== peerId));
    setSpeaking((prev) => {
      const n = { ...prev };
      delete n[peerId];
      return n;
    });
  }

  function presenceUser(m: Ably.PresenceMessage): PeerUser {
    const data = (m.data ?? {}) as { name?: string; avatar?: string | null };
    return {
      id: m.clientId ?? m.connectionId ?? "guest",
      name: data.name ?? "Guest",
      avatar: data.avatar ?? null,
    };
  }

  // Connect to (or learn about) a peer. A deterministic rule — the higher
  // connectionId initiates — means both sides independently agree on exactly
  // one offerer, regardless of who joined first (no glare).
  function discover(m: Ably.PresenceMessage) {
    const id = m.connectionId;
    if (!id || id === selfIdRef.current) return;
    const u = presenceUser(m);
    membersRef.current.set(id, u);
    createPeer(id, u, selfIdRef.current > id);
  }

  // ---- connect / teardown -------------------------------------------------
  useEffect(() => {
    if (!roomId) {
      setStatus("idle");
      setPeers([]);
      setSpeaking({});
      return;
    }

    let cancelled = false;
    setStatus("connecting");
    setError(null);

    (async () => {
      // Try for a mic, but never block joining on it. If it's unavailable
      // (denied, dismissed, no device, or an insecure context where
      // mediaDevices is undefined) we connect in listen-only mode instead.
      let stream: MediaStream | null = null;
      try {
        stream = (await navigator.mediaDevices?.getUserMedia({ audio: true, video: false })) ?? null;
      } catch {
        stream = null;
      }
      if (cancelled) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }
      localStreamRef.current = stream;
      setHasMic(!!stream);
      if (stream) {
        attachAnalyser("self", stream);
      } else {
        setMuted(true); // no mic to transmit
      }

      // Pull ICE servers (incl. TURN, if configured) before any peer arrives.
      try {
        const res = await fetch("/api/ice", { cache: "no-store" });
        const data = await res.json();
        if (Array.isArray(data?.iceServers) && data.iceServers.length) {
          iceConfigRef.current = { iceServers: data.iceServers };
        }
      } catch {
        /* fall back to the bundled STUN-only config */
      }
      if (cancelled) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }

      // Preflight the token so room-full / expired / not-signed-in produce a
      // clear message instead of an opaque connection failure.
      try {
        const tr = await fetch(`/api/ably-token?room=${encodeURIComponent(roomId)}`, { cache: "no-store" });
        if (!tr.ok) {
          const d = await tr.json().catch(() => null);
          if (!cancelled) {
            setError(d?.error ?? "Couldn't join this room.");
            setStatus("error");
          }
          return;
        }
      } catch {
        if (!cancelled) {
          setError("Couldn't reach the voice server.");
          setStatus("error");
        }
        return;
      }
      if (cancelled) return;

      const client = new Ably.Realtime({
        echoMessages: false, // don't receive our own published messages
        authCallback: async (_params, cb) => {
          try {
            const r = await fetch(`/api/ably-token?room=${encodeURIComponent(roomId)}`, { cache: "no-store" });
            const d = await r.json();
            if (!r.ok) return cb(d?.error ?? "auth failed", null);
            cb(null, d);
          } catch (e) {
            cb(e instanceof Error ? e.message : "auth failed", null);
          }
        },
      });
      ablyRef.current = client;
      const channel = client.channels.get(`room:${roomId}`);
      channelRef.current = channel;

      // Signaling messages addressed to us.
      channel.subscribe("signal", (msg) => {
        const d = msg.data as { to: string; from: string; data: unknown };
        if (d.to !== selfIdRef.current) return;
        onSignal(d.from, d.data);
      });
      // Mute-state broadcasts from peers.
      channel.subscribe("state", (msg) => {
        const d = msg.data as { from: string; muted: boolean };
        if (d.from === selfIdRef.current) return;
        setPeers((prev) => prev.map((p) => (p.id === d.from ? { ...p, muted: d.muted } : p)));
      });

      // Presence = who's in the room.
      channel.presence.subscribe("enter", (m) => discover(m));
      channel.presence.subscribe("update", (m) => discover(m));
      channel.presence.subscribe("leave", (m) => m.connectionId && removePeer(m.connectionId));

      client.connection.on("failed", (sc) => {
        if (!cancelled) {
          setError(sc.reason?.message ?? "Voice connection failed.");
          setStatus("error");
        }
      });
      client.connection.on("suspended", () => {
        if (!cancelled) setStatus("connecting"); // Ably keeps retrying
      });

      // Once connected: enter presence, then offer to everyone already here.
      client.connection.once("connected", () => {
        if (cancelled) return;
        selfIdRef.current = client.connection.id ?? "self";
        const me = userRef.current;
        (async () => {
          try {
            await channel.presence.enter({ name: me?.name ?? "Guest", avatar: me?.avatar ?? null });
            const members = await channel.presence.get();
            if (cancelled) return;
            setStatus("connected");
            for (const m of members) discover(m);
          } catch {
            if (!cancelled) {
              setError("Couldn't join the room channel.");
              setStatus("error");
            }
          }
        })();
      });
    })();

    return () => {
      cancelled = true;
      try {
        channelRef.current?.presence.leave();
      } catch {
        /* not entered */
      }
      channelRef.current?.unsubscribe();
      channelRef.current?.presence.unsubscribe();
      ablyRef.current?.close();
      channelRef.current = null;
      ablyRef.current = null;
      pcsRef.current.forEach((pc) => pc.close());
      pcsRef.current.clear();
      audiosRef.current.forEach((el) => (el.srcObject = null));
      audiosRef.current.clear();
      analysersRef.current.clear();
      membersRef.current.clear();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      acRef.current?.close().catch(() => {});
      acRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, retryNonce]);

  // ---- controls -----------------------------------------------------------
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return; // listen-only — nothing to mute
    setMuted((m) => {
      const next = !m;
      const track = localStreamRef.current?.getAudioTracks()[0];
      if (track) track.enabled = !next;
      sendState(next);
      return next;
    });
  }, []);

  // Re-attempt the connection — chiefly to re-trigger the mic permission
  // prompt after a failure, without forcing a full page reload.
  const retry = useCallback(() => {
    setError(null);
    setStatus("connecting");
    setRetryNonce((n) => n + 1);
  }, []);

  const toggleDeafen = useCallback(() => {
    setDeafened((d) => {
      const next = !d;
      deafenedRef.current = next;
      audiosRef.current.forEach((el) => (el.muted = next));
      if (next) {
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (track) track.enabled = false;
        setMuted(true);
        sendState(true);
      }
      return next;
    });
  }, []);

  return {
    status,
    error,
    peers,
    selfId: selfIdRef.current,
    muted,
    deafened,
    speaking,
    hasMic,
    toggleMute,
    toggleDeafen,
    retry,
  };
}
