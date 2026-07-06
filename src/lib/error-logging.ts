/**
 * Client-side error logging + global handlers.
 * Posts to /api/errors (throttled) and recovers from stale-deploy chunk errors.
 */

import { isChunkLoadError, recoverFromChunkError } from "@/lib/chunk-recovery";

// Throttle so a runaway error (e.g. a reconnect loop firing unhandledrejection
// repeatedly) can never storm /api/errors — every POST is a Vercel invocation +
// a DB write. Cap per session + dedup identical messages. Console still logs.
let sentCount = 0;
const MAX_PER_SESSION = 8;
const seen = new Set<string>();
const IGNORE: RegExp[] = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i, // cross-origin script error, no actionable detail
  /Non-Error promise rejection captured/i,
];

function shouldPost(message: string): boolean {
  if (!message) return false;
  if (IGNORE.some((re) => re.test(message))) return false;
  if (seen.has(message)) return false;
  if (sentCount >= MAX_PER_SESSION) return false;
  return true;
}

export function logError(
  message: string,
  stack?: string,
  context?: Record<string, unknown>
) {
  // Always log to console (stripped in prod except error/warn by next.config).
  console.error("[haistudy error]", message, stack);

  if (!shouldPost(message)) return;
  seen.add(message);
  sentCount++;

  // Send to API (fire-and-forget)
  try {
    fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        stack: stack || null,
        context: context || null,
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : null,
      }),
    }).catch(() => {
      // Silently fail - don't cause more errors
    });
  } catch {
    // Silently fail
  }
}

/**
 * Setup global error handlers. Call once at the app root (GlobalErrorHandler).
 * Logs uncaught errors + unhandled rejections, and recovers from stale-deploy
 * chunk-load failures (the dead-UI / "must force-refresh" class of bug).
 */
export function setupGlobalErrorHandlers() {
  if (typeof window === "undefined") return;
  const w = window as unknown as { __hsErrHandlers?: boolean };
  if (w.__hsErrHandlers) return; // idempotent across StrictMode double-mount
  w.__hsErrHandlers = true;

  window.addEventListener("error", (event) => {
    if (isChunkLoadError(event.error) || isChunkLoadError(event.message)) {
      recoverFromChunkError();
    }
    logError(event.message, event.error?.stack, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    if (isChunkLoadError(reason)) recoverFromChunkError();
    const message =
      reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    logError(`Unhandled Promise: ${message}`, stack);
  });
}
