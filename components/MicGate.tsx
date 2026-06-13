"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, AlertTriangle, X } from "lucide-react";
import { useMicPermission } from "@/lib/useMicPermission";

// Lobby-level prompt that asks for microphone access before the user picks a
// room, so they're ready to talk the moment they join. On browsers that allow
// it we request on load; everywhere we offer an explicit "Allow" button (the
// only reliable trigger on Safari and after a dismissed prompt).
export default function MicGate() {
  const perm = useMicPermission();
  const [requesting, setRequesting] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const autoTried = useRef(false);

  const request = useCallback(async () => {
    setRequesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      stream.getTracks().forEach((t) => t.stop()); // release; rooms re-acquire it
    } catch {
      /* dismissed/blocked — useMicPermission reflects the new state */
    } finally {
      setRequesting(false);
    }
  }, []);

  // Ask up front. Browsers that need a user gesture (Safari) no-op here and
  // fall back to the button below; once granted, the banner disappears.
  useEffect(() => {
    if (perm === "prompt" && !autoTried.current) {
      autoTried.current = true;
      request();
    }
  }, [perm, request]);

  if (perm === "granted" || perm === "unknown" || dismissed) return null;

  const blocked = perm === "denied";

  return (
    <div className="mt-8 flex animate-fade-up items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl sm:items-center">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          blocked ? "bg-amber-400/15 text-amber-300" : "bg-brand-500/15 text-brand-400"
        }`}
      >
        {blocked ? <AlertTriangle size={20} /> : <Mic size={20} />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-100">
          {blocked ? "Microphone is blocked" : "Enable your microphone"}
        </div>
        <p className="mt-0.5 text-sm text-slate-400">
          {blocked
            ? "Tap the lock or “aA” icon next to the address bar and allow the microphone — this updates automatically."
            : "Voice rooms need your mic. Allow it now so you're ready to talk the moment you join."}
        </p>
      </div>

      {!blocked && (
        <button
          onClick={request}
          disabled={requesting}
          className="btn-primary shrink-0 px-4 py-2.5 text-sm"
        >
          {requesting ? "Waiting…" : "Allow microphone"}
        </button>
      )}

      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="shrink-0 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-200"
      >
        <X size={16} />
      </button>
    </div>
  );
}
