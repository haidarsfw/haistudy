/**
 * Device fingerprinting for multi-device enforcement.
 * Adapted from old firebase.js getDeviceId() - generates a stable
 * browser fingerprint from hardware/software signals + timestamp suffix.
 */

export function getDeviceId(): string {
  if (typeof window === "undefined") return "server";

  let deviceId = localStorage.getItem("hs-device-id");
  if (deviceId) return deviceId;

  const nav = window.navigator;
  const screen = window.screen;

  const fingerprint = [
    nav.userAgent,
    nav.language,
    screen.colorDepth,
    `${screen.width}x${screen.height}`,
    new Date().getTimezoneOffset(),
    nav.hardwareConcurrency || 0,
    nav.platform,
  ].join("|");

  deviceId = btoa(fingerprint).slice(0, 32) + "_" + Date.now().toString(36);
  localStorage.setItem("hs-device-id", deviceId);
  return deviceId;
}

export function getDeviceType(): "desktop" | "mobile" | "tablet" {
  if (typeof window === "undefined") return "desktop";

  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/.test(ua))
    return "mobile";
  return "desktop";
}
