// Shared time/number formatting helpers. Kept tiny and dependency-free so any
// client or server module can reuse them (avoids the duplicated inline
// formatters that lived in exam-launch / admin license-table).

/** "12m 5s" — short duration for a single attempt. */
export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}m ${s}s`;
}

/** "2h 15m" / "45m" — compact hours+minutes from a SECONDS total. */
export function formatHM(seconds: number): string {
  const totalMin = Math.max(0, Math.floor(seconds / 60));
  return formatMinutesHM(totalMin);
}

/** "2h 15m" / "45m" — compact hours+minutes from a MINUTES total. */
export function formatMinutesHM(minutes: number): string {
  const total = Math.max(0, Math.floor(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}
