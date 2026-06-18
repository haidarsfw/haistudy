import type { KilatCard } from "@/types";

/**
 * A card's recorded response. `correct` drives scoring (for graded kinds);
 * `data` holds the card-specific answer so a revisited card can re-render its
 * locked state (e.g. which option was chosen). On resume from persisted
 * progress, `data` is absent and cards fall back to a generic review state.
 */
export interface KilatResponse {
  correct: boolean;
  data?: unknown;
}

export interface KilatCardProps {
  card: KilatCard;
  response?: KilatResponse;
  /** Report the outcome once. Ignored by the hook if the card is already locked. */
  onAnswer: (correct: boolean, data?: unknown) => void;
}

// Kinds that are gated (must be answered/completed before advancing) and locked
// after the first answer. table(walkthrough) is interactive-to-read but NOT gated.
export const GATED_KINDS = new Set<KilatCard["kind"]>([
  "check", "scenario", "fill", "checkpoint", "multi", "order",
  "categorize", "swipe", "calc", "table", "hotspot", "prompt", "match",
]);

// Kinds that count toward the score. Everything else is ungraded.
export const GRADED_KINDS = new Set<KilatCard["kind"]>([
  "check", "scenario", "fill", "checkpoint", "multi", "order",
  "categorize", "swipe", "calc", "hotspot", "prompt",
  // table is graded only in "fill" mode and match is never graded - handled by
  // isGraded() below since those need the card object, not just the kind.
]);

export const POINTS_PER_CARD = 10;

/** Whether a specific card instance counts toward the score. */
export function isGraded(card: KilatCard): boolean {
  if (card.kind === "match") return false;
  if (card.kind === "table") return card.mode === "fill";
  return GRADED_KINDS.has(card.kind);
}

/** Whether a card must be completed (or force-skipped) before advancing. */
export function isGated(card: KilatCard): boolean {
  if (card.kind === "table") return card.mode === "fill";
  return GATED_KINDS.has(card.kind);
}
