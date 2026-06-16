// ============================================
// Display-name helpers (short name / nickname)
// ============================================
// Users supply a short "nama panggilan" at order time (payments form + admin
// quick-gen). It is shown everywhere instead of the full legal name. Existing
// users / missing values fall back to the first word of the full name. The full
// name is kept only for admin records.

/** First whitespace-delimited word of a string ("Andrew Tan" → "Andrew"). */
export function firstWord(s: string | null | undefined): string {
  return (s ?? "").trim().split(/\s+/)[0] || "";
}

/**
 * Resolve the name to display: explicit short name if set, else the first word
 * of the full name, else a neutral fallback. Never returns an empty string.
 */
export function displayName(o: { shortName?: string | null; name?: string | null }): string {
  return (o.shortName?.trim() || firstWord(o.name)) || "Pengguna";
}
