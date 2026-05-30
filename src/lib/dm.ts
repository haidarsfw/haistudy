// ============================================
// DM helpers - deterministic conversation pairing
// ============================================
// A conversation is identified by a sorted pair of license keys so that
// (A,B) and (B,A) map to the same row. Matches the DB CHECK constraint
// participants[1] < participants[2] (1-indexed in Postgres).

/** Sort two license keys ascending so the pair is canonical. */
export function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/** Given a conversation's participants and the viewer, return the other key. */
export function otherParticipant(
  participants: readonly string[],
  me: string
): string | null {
  return participants.find((p) => p !== me) ?? null;
}

/** Stable client-side key for a pair (used for optimistic UI before the row exists). */
export function pairKey(a: string, b: string): string {
  const [x, y] = orderedPair(a, b);
  return `${x}__${y}`;
}
