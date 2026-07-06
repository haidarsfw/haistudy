// Stale-deploy chunk-load recovery.
//
// When a new deploy rotates content-hashed chunk URLs while an old tab or
// installed PWA is still open, a later code-split `import()` (a lazy panel, a
// scoped data loader, the exam player) can fail to fetch — leaving a dead UI /
// infinite spinner until a manual hard-refresh. This module detects that class
// of failure and recovers: reload ONCE (after purging caches) to pull fresh
// HTML + chunks; on a repeat within the same browser session, surface the
// update banner instead so the user reloads deliberately — never an infinite
// reload loop.

import { PWA_EVENTS } from "@/lib/pwa-version";

const RELOAD_FLAG = "hs-chunk-reloaded";

/** True when an error looks like a failed dynamic import / chunk fetch. */
export function isChunkLoadError(err: unknown): boolean {
  const e = err as { name?: string; message?: string } | null;
  const name = e?.name ?? "";
  const msg = e?.message ?? String(err ?? "");
  return (
    name === "ChunkLoadError" ||
    /Loading chunk \d+ failed/i.test(msg) ||
    /Loading CSS chunk/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg)
  );
}

/** Clear the once-per-session reload guard after a healthy load. */
export function markAppHealthy(): void {
  try {
    sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    /* sessionStorage unavailable */
  }
}

/**
 * Recover from a stale-deploy chunk failure. Auto-reload once (after purging
 * Cache Storage so no stale app-shell/chunk is re-served); on a repeat in the
 * same session, dispatch VERSION_CHANGED so the UpdateBanner pill appears and
 * the user reloads deliberately. Production only — dev HMR rotates chunks by
 * design and must never trigger a reload loop.
 */
export function recoverFromChunkError(): void {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV !== "production") return;

  let alreadyReloaded = false;
  try {
    alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === "1";
  } catch {
    /* ignore */
  }

  if (alreadyReloaded) {
    // Second failure this session → don't loop; let the user reload on tap.
    window.dispatchEvent(new Event(PWA_EVENTS.VERSION_CHANGED));
    return;
  }

  try {
    sessionStorage.setItem(RELOAD_FLAG, "1");
  } catch {
    /* ignore */
  }

  void (async () => {
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      /* cache purge best-effort */
    }
    window.location.reload();
  })();
}
