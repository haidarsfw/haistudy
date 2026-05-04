"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getSubscription,
  isPushSupported,
  isIosSafari,
  isStandalone,
  subscribePush,
  unsubscribePush,
} from "@/lib/push/subscribe";

export type PushPermissionState =
  | "default"
  | "granted"
  | "denied"
  | "unsupported";

export function useWebPush() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<PushPermissionState>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false);

  useEffect(() => {
    const s = isPushSupported();
    setSupported(s);
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission as PushPermissionState);
    } else {
      setPermission("unsupported");
    }
    setIosNeedsInstall(isIosSafari() && !isStandalone());

    if (s) {
      getSubscription().then((sub) => setSubscribed(!!sub));
    }

    // Re-sync permission if user toggles in browser settings while page open
    if (typeof navigator !== "undefined" && "permissions" in navigator) {
      navigator.permissions
        .query({ name: "notifications" as PermissionName })
        .then((status) => {
          status.onchange = () => {
            setPermission(Notification.permission as PushPermissionState);
            if (Notification.permission !== "granted") setSubscribed(false);
          };
        })
        .catch(() => {});
    }
  }, []);

  const subscribe = useCallback(async () => {
    setBusy(true);
    try {
      const res = await subscribePush();
      if (res.ok) {
        setPermission("granted");
        setSubscribed(true);
        return { ok: true as const };
      }
      if (res.reason === "denied") setPermission("denied");
      return { ok: false as const, reason: res.reason };
    } finally {
      setBusy(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setBusy(true);
    try {
      await unsubscribePush();
      setSubscribed(false);
      return true;
    } finally {
      setBusy(false);
    }
  }, []);

  const sendTest = useCallback(async () => {
    const res = await fetch("/api/push/test", { method: "POST" });
    return res.ok;
  }, []);

  return {
    supported,
    permission,
    subscribed,
    busy,
    iosNeedsInstall,
    subscribe,
    unsubscribe,
    sendTest,
  };
}
