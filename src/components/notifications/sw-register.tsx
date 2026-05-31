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
    if (process.env.NODE_ENV !== "production") return;
    return whenIdle(() => {
      void registerServiceWorker();
    });
  }, []);
  return null;
}
