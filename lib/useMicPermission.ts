"use client";

import { useEffect, useState } from "react";

export type MicPermission = "granted" | "denied" | "prompt" | "unknown";

// Live microphone-permission state via the Permissions API. Returns "unknown"
// where the API is unavailable (e.g. some Safari versions) so callers can fall
// back to just attempting getUserMedia. Updates automatically when the user
// changes the permission in their browser's site settings.
export function useMicPermission(): MicPermission {
  const [state, setState] = useState<MicPermission>("unknown");

  useEffect(() => {
    let status: PermissionStatus | null = null;
    let cancelled = false;

    (async () => {
      try {
        status = await navigator.permissions?.query({
          name: "microphone" as PermissionName,
        });
        if (!status || cancelled) return;
        setState(status.state as MicPermission);
        status.onchange = () => {
          if (status && !cancelled) setState(status.state as MicPermission);
        };
      } catch {
        /* Permissions API unsupported — leave as "unknown" */
      }
    })();

    return () => {
      cancelled = true;
      if (status) status.onchange = null;
    };
  }, []);

  return state;
}
