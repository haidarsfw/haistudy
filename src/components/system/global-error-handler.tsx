"use client";

import { useEffect } from "react";
import { setupGlobalErrorHandlers } from "@/lib/error-logging";

/**
 * Mounts once at the app root (root layout). Wires window `error` /
 * `unhandledrejection` handlers — throttled logging to /api/errors + recovery
 * from stale-deploy chunk-load failures. Renders nothing.
 */
export function GlobalErrorHandler() {
  useEffect(() => {
    setupGlobalErrorHandlers();
  }, []);
  return null;
}
