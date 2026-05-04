"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/push/subscribe";

/**
 * Mounts once in app/admin shells. Registers /sw.js so push events can be
 * received even when no /api/push/subscribe call has been made yet (the SW
 * also needs to be active for re-subscription on `pushsubscriptionchange`).
 */
export function SWRegister() {
  useEffect(() => {
    void registerServiceWorker();
  }, []);
  return null;
}
