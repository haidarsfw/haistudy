/**
 * Per-day "dismiss" for tips/banners: once dismissed, it stays hidden for the
 * rest of that calendar day (persisted in localStorage), then shows again the
 * next day. Standardizes the behavior across all dismissible hints.
 *
 * Usage:
 *   if (!isDismissedToday("exam-scratchpad-intro")) show the tip;
 *   onDismiss => dismissToday("exam-scratchpad-intro")
 */

const PREFIX = "hs-dismiss-";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (local-ish, stable)
}

export function isDismissedToday(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(PREFIX + key) === todayStr();
  } catch {
    return false;
  }
}

export function dismissToday(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFIX + key, todayStr());
  } catch {
    /* ignore */
  }
}
