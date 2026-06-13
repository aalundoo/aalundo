"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const SPEAK_THRESHOLD = 0.045;

export function useVoiceRoom(roomId: string | null) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [speaking, setSpeaking] = useState<Record<string, boolean>>({});
  // Bumping this re-runs the connect effect — lets the user re-request mic
  // access (or recover from a transient failure) without reloading the page.
  const [retryNonce, setRetryNonce] = useState(0);

  const esRef = useRef<EventSource | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const selfIdRef = useRef<string>("self");
  const acRef = useRef<AudioContext | null>(null);
  const analysersRef = useRef<Map<string, AnalyserNode>>(new Map());
  const deafenedRef = useRef(false);

  // POST a signaling message to the relay (from = our peer id).
  const post = useCallback((body: Record<string, unknown>) => {
    fetch("/api/signal/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, from: selfIdRef.current }),
      keepalive: true,
    }).catch(() => {});
  }, []);

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

  function createPeer(peerId: string, user: PeerUser, initiator: boolean): RTCPeerConnection {
    const existing = pcsRef.current.get(peerId);
    if (existing) return existing;

    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcsRef.current.set(peerId, pc);

    localStreamRef.current?.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));

    pc.onicecandidate = (e) => {
      if (e.candidate) post({ type: "signal", to: peerId, data: { candidate: e.candidate } });
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
      prev.some((p) => p.id === peerId) ? prev : [...prev, { id: peerId, user, muted: false }],
    );

    if (initiator) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer).then(() => offer))
        .then((offer) => post({ type: "signal", to: peerId, data: { sdp: offer } }))
        .catch((err) => console.error("offer failed:", err));
    }
    return pc;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function onSignal(from: string, data: any, knownUser?: PeerUser) {
    let pc = pcsRef.current.get(from);
    if (data.sdp) {
      if (!pc) pc = createPeer(from, knownUser ?? { id: from, name: "Guest", avatar: null }, false);
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      if (data.sdp.type === "offer") {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        post({ type: "signal", to: from, data: { sdp: answer } });
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
    setPeers((prev) => prev.filter((p) => p.id !== peerId));
    setSpeaking((prev) => {
      const n = { ...prev };
      delete n[peerId];
      return n;
    });
  }

  function resetPeers() {
    pcsRef.current.forEach((pc) => pc.close());
    pcsRef.current.clear();
    audiosRef.current.forEach((el) => (el.srcObject = null));
    audiosRef.current.clear();
    for (const id of [...analysersRef.current.keys()]) {
      if (id !== "self") analysersRef.current.delete(id);
    }
    setPeers([]);
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
      let stream: MediaStream;
      try {
        // This is what surfaces the browser's "Allow microphone?" prompt. If the
        // user previously dismissed it, calling again re-prompts; if they hard-
        // blocked it, it throws immediately and we guide them to unblock.
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch (err) {
        if (!cancelled) {
          setError(await micErrorMessage(err));
          setStatus("error");
        }
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      localStreamRef.current = stream;
      attachAnalyser("self", stream);

      const es = new EventSource(`/api/signal/stream?room=${encodeURIComponent(roomId)}`);
      esRef.current = es;

      es.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        switch (msg.type) {
          case "joined":
            selfIdRef.current = msg.selfId;
            resetPeers(); // rebuild cleanly (also handles reconnects)
            setStatus("connected");
            for (const p of msg.peers as { id: string; user: PeerUser }[]) {
              createPeer(p.id, p.user, true);
            }
            break;
          case "peer-join":
            createPeer(msg.peer.id, msg.peer.user, false);
            break;
          case "signal":
            onSignal(msg.from, msg.data);
            break;
          case "peer-leave":
            removePeer(msg.id);
            break;
          case "peer-state":
            setPeers((prev) => prev.map((p) => (p.id === msg.id ? { ...p, muted: msg.muted } : p)));
            break;
          case "error":
            setError(msg.message);
            setStatus("error");
            es.close(); // stop EventSource from reconnecting into the error
            break;
        }
      };

      es.onerror = () => {
        if (es.readyState === EventSource.CLOSED && !cancelled) {
          setError("Lost connection to the voice server.");
          setStatus("error");
        }
      };
    })();

    return () => {
      cancelled = true;
      esRef.current?.close();
      pcsRef.current.forEach((pc) => pc.close());
      pcsRef.current.clear();
      audiosRef.current.forEach((el) => (el.srcObject = null));
      audiosRef.current.clear();
      analysersRef.current.clear();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      acRef.current?.close().catch(() => {});
      acRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, retryNonce]);

  // ---- controls -----------------------------------------------------------
  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      const track = localStreamRef.current?.getAudioTracks()[0];
      if (track) track.enabled = !next;
      post({ type: "state", muted: next });
      return next;
    });
  }, [post]);

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
        post({ type: "state", muted: true });
      }
      return next;
    });
  }, [post]);

  return {
    status,
    error,
    peers,
    selfId: selfIdRef.current,
    muted,
    deafened,
    speaking,
    toggleMute,
    toggleDeafen,
    retry,
  };
}

// Turn a getUserMedia rejection into a friendly, actionable message. When the
// prompt was hard-blocked we say how to unblock; when it was merely dismissed
// (state still "prompt") we tell them to try again and choose Allow.
async function micErrorMessage(err: unknown): Promise<string> {
  const name = (err as DOMException | undefined)?.name;

  if (name === "NotAllowedError" || name === "SecurityError") {
    let state: PermissionState | null = null;
    try {
      const res = await navigator.permissions?.query({
        name: "microphone" as PermissionName,
      });
      state = res?.state ?? null;
    } catch {
      /* Permissions API unsupported (e.g. some Safari versions) — fall through */
    }
    if (state === "denied") {
      return "Microphone access is blocked. Open this site's permissions (tap the lock or “aA” icon next to the address bar), allow the microphone, then tap Try again.";
    }
    return "We need your microphone to connect you. Tap Try again and choose Allow when your browser asks.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No microphone was found. Connect one or check your device settings, then tap Try again.";
  }
  if (name === "NotReadableError") {
    return "Your microphone is being used by another app. Close it, then tap Try again.";
  }
  return "We couldn't access your microphone. Check that your browser allows it, then tap Try again.";
}
