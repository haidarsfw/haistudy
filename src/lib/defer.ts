/**
 * Schedule work after the browser reaches idle (or after a timeout fallback).
 *
 * Used to push non-critical realtime/SW subscriptions off the FCP/LCP path so
 * PageSpeed scores TBT and INP against an empty main thread. Real users see
 * the subscribe ~1.5s after first paint — within network roundtrip noise.
 *
 * Returns a cancel function so callers can abort if the host effect unmounts
 * before idle fires (Strict Mode double-invoke, route navigation, etc.).
 */
export function whenIdle(cb: () => void, timeoutMs = 1500): () => void {
  if (typeof window === "undefined") return () => {};
  let cancelled = false;
  const win = window as Window & {
    requestIdleCallback?: (
      cb: IdleRequestCallback,
      opts?: IdleRequestOptions
    ) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (win.requestIdleCallback) {
    const id = win.requestIdleCallback(
      () => {
        if (!cancelled) cb();
      },
      { timeout: timeoutMs }
    );
    return () => {
      cancelled = true;
      win.cancelIdleCallback?.(id);
    };
  }
  const id = window.setTimeout(() => {
    if (!cancelled) cb();
  }, timeoutMs);
  return () => {
    cancelled = true;
    window.clearTimeout(id);
  };
}
