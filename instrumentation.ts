// Runs once when the Next.js server starts (Node runtime only). It schedules a
// node-cron job that hits the /api/cron/prune route every hour to delete
// expired custom rooms. We trigger it over HTTP (rather than importing the
// Mongo code here) so this file stays free of Node-only deps that the edge
// compiler can't bundle.

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const g = globalThis as unknown as { __cronStarted?: boolean };
  if (g.__cronStarted) return; // guard against double-registration (HMR)
  g.__cronStarted = true;

  const cron = await import("node-cron");

  const base =
    process.env.NEXT_PUBLIC_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? 3000}`;
  const secret = process.env.CRON_SECRET;
  const url = `${base}/api/cron/prune${secret ? `?key=${secret}` : ""}`;

  // Every hour: ask the prune route to delete expired custom rooms.
  cron.schedule("0 * * * *", async () => {
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.pruned > 0) console.log(`[cron] pruned ${data.pruned} expired room(s)`);
    } catch (e) {
      console.error("[cron] prune request failed:", (e as Error).message);
    }
  });

  console.log("[cron] room-expiry job scheduled (every hour)");
}
