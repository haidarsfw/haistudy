/**
 * Browser-side helpers for Web Push subscription lifecycle.
 *  - registerServiceWorker(): one-shot SW install + activation.
 *  - subscribePush(): asks for Notification permission, then PushManager.subscribe,
 *    POSTs to /api/push/subscribe.
 *  - unsubscribePush(): tears down the subscription, POSTs to /api/push/unsubscribe.
 *  - getSubscription(): current PushSubscription (or null).
 *  - isPushSupported(): SW + PushManager + Notification all present.
 *  - isIosSafariStandalone(): user installed app to home screen on iOS.
 */

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  type IosNav = Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    Boolean((navigator as IosNav).standalone)
  );
}

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }
  if (registrationPromise) return registrationPromise;
  registrationPromise = navigator.serviceWorker
    .register("/sw.js", { scope: "/" })
    .then((reg) => reg)
    .catch((e) => {
      console.warn("[sw] register failed", e);
      return null;
    });
  return registrationPromise;
}

export async function getSubscription(): Promise<PushSubscription | null> {
  const reg = await registerServiceWorker();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

export async function subscribePush(): Promise<{
  ok: boolean;
  reason?: "unsupported" | "denied" | "no-vapid" | "error";
  subscription?: PushSubscription;
}> {
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };
  if (!VAPID_PUBLIC) return { ok: false, reason: "no-vapid" };

  const permission =
    Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;
  if (permission !== "granted") return { ok: false, reason: "denied" };

  const reg = await registerServiceWorker();
  if (!reg) return { ok: false, reason: "error" };

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToBuffer(VAPID_PUBLIC),
    });
  }
  const json = sub.toJSON();
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: json.keys,
      userAgent: navigator.userAgent,
    }),
  });
  return { ok: true, subscription: sub };
}

export async function unsubscribePush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const reg = await registerServiceWorker();
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return true;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  try {
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });
  } catch {
    /* server cleanup non-critical */
  }
  return true;
}
