/**
 * Client-side error logging.
 * Sends errors to /api/errors for persistence.
 */

export function logError(
  message: string,
  stack?: string,
  context?: Record<string, unknown>
) {
  // Log to console in development
  console.error("[haistudy error]", message, stack);

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
 * Setup global error handlers.
 * Call once in the app root.
 */
export function setupGlobalErrorHandlers() {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    logError(event.message, event.error?.stack, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const message =
      event.reason instanceof Error
        ? event.reason.message
        : String(event.reason);
    const stack =
      event.reason instanceof Error ? event.reason.stack : undefined;
    logError(`Unhandled Promise: ${message}`, stack);
  });
}
