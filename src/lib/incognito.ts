/**
 * Best-effort guess at whether this is a private / incognito tab.
 *
 * Used ONLY to warn, never to block. Every published detection trick gets
 * patched within a release or two, so a wrong guess is guaranteed eventually —
 * and blocking on a wrong guess would lock an honest student out the night
 * before an exam, which is far worse than the problem being solved.
 *
 * Why warn at all: a private window starts with empty storage, so it looks
 * like a brand new device every single time, quietly eats a device slot, and
 * then throws that slot away when the window closes. Saying so up front is the
 * cheapest possible fix.
 *
 * Signals, in order of reliability today:
 *  - Chromium/Safari cap the storage quota hard in private mode. A normal tab
 *    is offered a slice of the actual disk, which is far larger.
 *  - Firefox private mode has no service worker registration at all.
 */
export async function looksLikePrivateTab(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;

  try {
    // Firefox private: service workers are simply absent.
    if (
      /firefox/i.test(navigator.userAgent) &&
      !("serviceWorker" in navigator)
    ) {
      return true;
    }

    if (navigator.storage?.estimate) {
      const { quota } = await navigator.storage.estimate();
      if (typeof quota === "number" && quota > 0) {
        // Private windows land around or under ~1-2 GB regardless of disk;
        // a normal profile is offered far more. Deliberately generous so a
        // genuinely small disk does not get accused.
        const PRIVATE_CEILING = 2 * 1024 * 1024 * 1024;
        if (quota < PRIVATE_CEILING) return true;
      }
    }
  } catch {
    // Any failure means "no idea", which is the same as "do not warn".
  }

  return false;
}
