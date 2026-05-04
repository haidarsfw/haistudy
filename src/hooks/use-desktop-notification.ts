"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const PERMISSION_KEY = "hs-notif-browser-permission";
const OPT_IN_KEY = "hs-notif-browser-optin";
const LEGACY_PERMISSION_KEY = "hs-support-notif-permission";
const LEGACY_OPT_IN_KEY = "hs-support-notif-optin";

// One-shot key migration for users coming from the support-only build.
function migrateLegacyKeys() {
  if (typeof window === "undefined") return;
  try {
    const legacyPerm = localStorage.getItem(LEGACY_PERMISSION_KEY);
    if (legacyPerm && !localStorage.getItem(PERMISSION_KEY)) {
      localStorage.setItem(PERMISSION_KEY, legacyPerm);
    }
    const legacyOpt = localStorage.getItem(LEGACY_OPT_IN_KEY);
    if (legacyOpt && !localStorage.getItem(OPT_IN_KEY)) {
      localStorage.setItem(OPT_IN_KEY, legacyOpt);
    }
    // Clean up legacy keys so we don't drift
    if (legacyPerm) localStorage.removeItem(LEGACY_PERMISSION_KEY);
    if (legacyOpt) localStorage.removeItem(LEGACY_OPT_IN_KEY);
  } catch {
    /* ignore */
  }
}

type Status = "default" | "granted" | "denied" | "unsupported";

export interface UseDesktopNotificationResult {
  permission: Status;
  optedIn: boolean;
  setOptedIn: (v: boolean) => void;
  requestPermission: () => Promise<Status>;
  notify: (opts: {
    title: string;
    body?: string;
    tag?: string;
    onClick?: () => void;
  }) => void;
}

/**
 * Wraps the Notification API for support chat.
 *  - Lazy permission request via `requestPermission()`.
 *  - `optedIn` toggle persists in localStorage; user must explicitly opt in
 *    before any notification is shown.
 *  - `tag` per conversation prevents stacking (replaces previous notification).
 */
export function useDesktopNotification(): UseDesktopNotificationResult {
  const [permission, setPermission] = useState<Status>(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      return "unsupported";
    }
    return Notification.permission as Status;
  });
  const [optedIn, setOptedInState] = useState(() => {
    if (typeof window === "undefined") return false;
    migrateLegacyKeys();
    try {
      // Default ON so users who already granted permission get notified by default.
      const v = localStorage.getItem(OPT_IN_KEY);
      if (v === null) return true;
      return v === "1";
    } catch {
      return false;
    }
  });
  const lastNotifTagsRef = useRef<Set<string>>(new Set());

  // Sync permission status if it changes (e.g. user toggles in browser settings)
  useEffect(() => {
    if (typeof Notification === "undefined") return;
    const sync = () => setPermission(Notification.permission as Status);
    sync();
    // Permissions API: subscribe to changes if available
    if (
      typeof navigator !== "undefined" &&
      "permissions" in navigator &&
      navigator.permissions
    ) {
      navigator.permissions
        .query({ name: "notifications" as PermissionName })
        .then((status) => {
          status.onchange = sync;
        })
        .catch(() => {});
    }
  }, []);

  const setOptedIn = useCallback((v: boolean) => {
    setOptedInState(v);
    try {
      localStorage.setItem(OPT_IN_KEY, v ? "1" : "0");
    } catch {
      // ignore
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<Status> => {
    if (typeof Notification === "undefined") return "unsupported";
    if (Notification.permission === "granted") {
      setPermission("granted");
      return "granted";
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result as Status);
      try {
        localStorage.setItem(PERMISSION_KEY, result);
      } catch {
        // ignore
      }
      if (result === "granted") setOptedIn(true);
      return result as Status;
    } catch {
      return "denied";
    }
  }, [setOptedIn]);

  const notify = useCallback(
    ({ title, body, tag, onClick }: {
      title: string;
      body?: string;
      tag?: string;
      onClick?: () => void;
    }) => {
      if (
        typeof Notification === "undefined" ||
        Notification.permission !== "granted" ||
        !optedIn
      ) {
        return;
      }
      try {
        const n = new Notification(title, {
          body: body?.slice(0, 200),
          tag,
          icon: "/icons/icon-192.png",
          silent: false,
        });
        if (tag) lastNotifTagsRef.current.add(tag);
        n.onclick = () => {
          window.focus();
          onClick?.();
          n.close();
        };
      } catch {
        // ignore
      }
    },
    [optedIn]
  );

  return { permission, optedIn, setOptedIn, requestPermission, notify };
}
