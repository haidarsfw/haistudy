/**
 * Shared between the interruption queue and the session provider, which would
 * otherwise import each other.
 *
 * The value stored under this key is the licence that used up its one
 * interruption, not a bare "1". "Satu per masuk" means per LOGIN: signing out
 * and back in, or a second person signing in on the same tab, is a new entry
 * and earns its own. A bare flag outlived both, so a brand-new user on a shared
 * tab never saw their own first-run tour.
 */
export const MODAL_SPENT_KEY = "hs-interrupt-modal-spent";

/** Forget the spent entry. Called on logout. */
export function clearInterruptionEntry(): void {
  try {
    sessionStorage.removeItem(MODAL_SPENT_KEY);
  } catch {
    // Storage blocked: nothing was stored either.
  }
}
