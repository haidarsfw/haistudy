// ============================================
// PWA version + custom events
// ============================================
// SW_VERSION must match public/sw.js. The install banner remembers a
// "don't remind" choice scoped to this version, so bumping SW_VERSION
// re-surfaces the install prompt to users who previously dismissed it.

export const SW_VERSION = "v1";

export const PWA_EVENTS = {
  // Settings "Install app" button → install-banner shows the prompt.
  INSTALL_REQUEST: "hs:pwa-install-request",
  // use-version-check detects a new deploy → update-banner appears.
  VERSION_CHANGED: "hs-version-changed",
} as const;

// localStorage / sessionStorage keys
export const INSTALL_DISMISS_KEY = "hs-install-dismissed-until-sw-version";
export const INSTALL_SHOWN_KEY = "hs-install-shown";
export const JUST_UPDATED_KEY = "hs-just-updated";

/** True if the user dismissed the install banner for the CURRENT SW_VERSION. */
export function isInstallDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(INSTALL_DISMISS_KEY) === SW_VERSION;
  } catch {
    return false;
  }
}

export function dismissInstallUntilNextVersion(): void {
  try {
    localStorage.setItem(INSTALL_DISMISS_KEY, SW_VERSION);
  } catch {
    // ignore
  }
}

export function clearInstallDismiss(): void {
  try {
    localStorage.removeItem(INSTALL_DISMISS_KEY);
  } catch {
    // ignore
  }
}

/** Detect iOS Safari, which has no beforeinstallprompt - needs manual hint. */
export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

/** True when running as an installed standalone PWA. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}
