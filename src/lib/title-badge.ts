/**
 * Tiny tab-title badge manager.
 * Usage: setTitleBadge(3) → "(3) haistudy"; setTitleBadge(0) → "haistudy".
 * Stores base title at first call so we don't accumulate prefixes across calls.
 */

let baseTitle: string | null = null;
let currentBadge = 0;

function getBase(): string {
  if (baseTitle !== null) return baseTitle;
  if (typeof document === "undefined") return "haistudy";
  // Strip any pre-existing "(N) " prefix
  const t = document.title.replace(/^\(\d+\)\s+/, "");
  baseTitle = t || "haistudy";
  return baseTitle;
}

export function setTitleBadge(count: number): void {
  if (typeof document === "undefined") return;
  const base = getBase();
  currentBadge = Math.max(0, Math.floor(count));
  document.title = currentBadge > 0 ? `(${currentBadge}) ${base}` : base;
}

export function clearTitleBadge(): void {
  setTitleBadge(0);
}

export function getTitleBadge(): number {
  return currentBadge;
}

export function setBaseTitle(title: string): void {
  baseTitle = title;
  setTitleBadge(currentBadge);
}
