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
      // Actively tear down any SW + caches left behind by a prior prod build
      // (or an earlier round that only skipped registration). Without this the
      // old SW stays active in dev and keeps serving stale chunks until the
      // user manually unregisters it.
      if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        navigator.serviceWorker
          .getRegistrations()
          .then((rs) => rs.forEach((r) => r.unregister()))
          .catch(() => {});
        if (typeof window !== "undefined" && "caches" in window) {
          caches
            .keys()
            .then((ks) => ks.forEach((k) => caches.delete(k)))
            .catch(() => {});
        }
      }
      return;
    }
    return whenIdle(() => {
      void registerServiceWorker();
    });
  }, []);
  return null;
}
