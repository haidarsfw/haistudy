/**
 * Activity logging with stacking.
 * Sends activity events to /api/analytics for admin dashboard.
 * Repeated same actions within a window are stacked (count incremented).
 */

interface PendingLog {
  action: string;
  details: string;
  count: number;
  timer: ReturnType<typeof setTimeout>;
}

const STACK_WINDOW_MS = 5_000; // 5 seconds
const pendingLogs = new Map<string, PendingLog>();

function flush(key: string) {
  const pending = pendingLogs.get(key);
  if (!pending) return;
  pendingLogs.delete(key);

  try {
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: pending.action,
        details: pending.details,
        count: pending.count,
      }),
    }).catch(() => {
      // Silently fail
    });
  } catch {
    // Silently fail
  }
}

/**
 * Log a user activity event.
 * Repeated same action+details within 5s are stacked.
 */
export function logActivity(action: string, details: string = "") {
  const key = `${action}:${details}`;

  const existing = pendingLogs.get(key);
  if (existing) {
    existing.count++;
    clearTimeout(existing.timer);
    existing.timer = setTimeout(() => flush(key), STACK_WINDOW_MS);
    return;
  }

  pendingLogs.set(key, {
    action,
    details,
    count: 1,
    timer: setTimeout(() => flush(key), STACK_WINDOW_MS),
  });
}
