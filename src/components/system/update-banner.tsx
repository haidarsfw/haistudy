"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/components/providers/language-provider";
import { sounds } from "@/lib/sounds";
import { PWA_EVENTS, JUST_UPDATED_KEY } from "@/lib/pwa-version";

export function UpdateBanner() {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [reloading, setReloading] = useState(false);

  // Post-reload confirmation: if we set the flag before reloading, show it now.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(JUST_UPDATED_KEY) === "1") {
        sessionStorage.removeItem(JUST_UPDATED_KEY);
        toast.success(t("pwa.update_success"));
      }
    } catch {}
  }, [t]);

  // Surface the pill when a new deploy is detected. We NEVER auto-reload -
  // the user clicks to apply so in-progress drafts are never lost.
  useEffect(() => {
    const onChanged = () => setShow(true);
    window.addEventListener(PWA_EVENTS.VERSION_CHANGED, onChanged);

    // Also catch a waiting SW that appears via the browser's own update cycle.
    if ("serviceWorker" in navigator) {
      // Remember if we had a controller when the component mounted
      const hasController = !!navigator.serviceWorker.controller;

      const onControllerChange = () => {
        // Only show update banner if we already had a controller.
        // If hasController was false, this is the initial service worker registration for a new user/session,
        // so they already have the latest assets and don't need to reload.
        if (hasController) {
          setShow(true);
        }
      };

      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;
        if (reg.waiting) setShow(true);
        reg.addEventListener("updatefound", () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener("statechange", () => {
            if (sw.state === "installed" && navigator.serviceWorker.controller) {
              setShow(true);
            }
          });
        });
      });

      return () => {
        window.removeEventListener(PWA_EVENTS.VERSION_CHANGED, onChanged);
        navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      };
    }

    return () => window.removeEventListener(PWA_EVENTS.VERSION_CHANGED, onChanged);
  }, []);

  const applyUpdate = async () => {
    sounds.click();
    setReloading(true);
    try {
      sessionStorage.setItem(JUST_UPDATED_KEY, "1");
    } catch {}

    // Purge all Cache Storage first so a stale app-shell / chunk can never be
    // served after the reload. This is the part that previously forced users
    // to hard-refresh manually.
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {}

    if (!("serviceWorker" in navigator)) {
      window.location.reload();
      return;
    }

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const waiting = reg?.waiting;
      if (waiting) {
        // Reload once the new SW takes control, then hard-reload the page.
        let reloaded = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (reloaded) return;
          reloaded = true;
          window.location.reload();
        });
        waiting.postMessage({ type: "skipWaiting" });
        // Fallback in case controllerchange never fires.
        window.setTimeout(() => {
          if (!reloaded) {
            reloaded = true;
            window.location.reload();
          }
        }, 2500);
      } else {
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 top-3 z-[120] flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-primary/20 bg-card/95 py-1.5 pl-4 pr-1.5 shadow-lg backdrop-blur-md">
        <span className="text-xs font-medium">{t("pwa.update_available")}</span>
        <button
          onClick={applyUpdate}
          disabled={reloading}
          className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${reloading ? "animate-spin" : ""}`} />
          {t("pwa.update_button")}
        </button>
        <button
          onClick={() => setShow(false)}
          aria-label={t("common.close")}
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
