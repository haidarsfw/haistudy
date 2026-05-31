"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/push/subscribe";
import { whenIdle } from "@/lib/defer";

/**
 * Mounts once in app/admin shells. Registers /sw.js so push events can be
 * received even when no /api/push/subscribe call has been made yet (the SW
 * also needs to be active for re-subscription on `pushsubscriptionchange`).
 *
 * Registration is deferred to idle so it doesn't block FCP/LCP. Push delivery
 * still works on subsequent visits because the SW is then active.
 */
export function SWRegister() {
  useEffect(() => {
    // Never register the SW in development. A persisted dev SW locks onto
    // Turbopack chunks that change on every reload → stale "module factory is
    // not available" chunks. Production only.
    if (process.env.NODE_ENV !== "production") {
      // ONE-TIME dev cleanup: evict a legacy service worker (pre-v3 versions had
      // a fetch handler that served stale Turbopack chunks → "module factory is
      // not available"). Guarded by a flag so it runs once per browser, not on
      // every load - otherwise it would keep tearing down the on-demand push SW
      // that the notifications settings register in dev. The current sw.js has
      // no fetch handler, so leaving a live SW in dev is harmless for chunks.
      try {
        const FLAG = "hs-sw-dev-cleaned-v3";
        if (
          typeof window !== "undefined" &&
          "serviceWorker" in navigator &&
          !window.localStorage.getItem(FLAG)
        ) {
          window.localStorage.setItem(FLAG, "1");
          navigator.serviceWorker
            .getRegistrations()
            .then((rs) => rs.forEach((r) => r.unregister()))
            .catch(() => {});
          if ("caches" in window) {
            caches
              .keys()
              .then((ks) => ks.forEach((k) => caches.delete(k)))
              .catch(() => {});
          }
        }
      } catch {
        /* localStorage blocked - skip cleanup */
      }
      return;
    }
    return whenIdle(() => {
      void registerServiceWorker();
    });
  }, []);
  return null;
}
