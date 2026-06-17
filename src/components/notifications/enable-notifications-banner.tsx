"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWebPush } from "@/hooks/use-web-push";
import { useSession } from "@/components/providers/session-provider";
import { sounds } from "@/lib/sounds";
import { toast } from "@/components/ui/toast";
import { INSTALL_SHOWN_KEY, isInstallDismissed } from "@/lib/pwa-version";

const DISMISSED_AT_KEY = "hs-notif-banner-dismissed-at";
const REPROMPT_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Soft, dismissible banner that nudges the user to enable Web Push.
 * Shows when:
 *  - signed in
 *  - browser supports push
 *  - permission === "default" (not yet asked or asked & ignored)
 *  - banner not dismissed in the last 7 days
 *
 * iOS Safari (non-PWA): shows install-to-home-screen hint instead, since
 * iOS only allows web push for installed PWAs.
 */
export function EnableNotificationsBanner() {
  const { session } = useSession();
  const { supported, permission, subscribed, busy, iosNeedsInstall, subscribe } =
    useWebPush();
  const [dismissed, setDismissed] = useState(true); // start hidden until effect decides
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(DISMISSED_AT_KEY);
      if (!raw) {
        setDismissed(false);
        return;
      }
      const at = Number(raw);
      if (!Number.isFinite(at)) {
        setDismissed(false);
        return;
      }
      setDismissed(Date.now() - at < REPROMPT_AFTER_MS);
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!mounted || !session || dismissed || subscribed) return null;
  if (!supported && !iosNeedsInstall) return null;
  if (permission === "denied") return null; // can't re-prompt programmatically
  if (supported && permission === "granted" && !subscribed) {
    // permission granted but no subscription - show "Enable" so user can subscribe
  }

  // The iOS "Add to Home Screen" hint duplicates the InstallBanner POPUP, so the
  // popup is primary. This header reminder only appears AFTER the popup has been
  // shown & dismissed once, and never in the same session the popup showed —
  // so mobile first-login stays clean (only the welcome banner there). Returning
  // users see it occasionally (7-day dismiss cooldown above).
  if (iosNeedsInstall) {
    const popupDismissed = (() => {
      try {
        return isInstallDismissed();
      } catch {
        return false;
      }
    })();
    const popupShownThisSession = (() => {
      try {
        return sessionStorage.getItem(INSTALL_SHOWN_KEY) === "1";
      } catch {
        return false;
      }
    })();
    if (!popupDismissed || popupShownThisSession) return null;
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  const handleEnable = async () => {
    sounds.click();
    const res = await subscribe();
    if (res.ok) {
      toast.success("Notifikasi aktif. Pesan support akan masuk ke layar kamu.");
      handleDismiss();
    } else if (res.reason === "denied") {
      toast.error(
        "Permission ditolak. Aktifkan dari pengaturan browser jika ingin notifikasi."
      );
    } else if (res.reason === "no-vapid") {
      toast.error("Konfigurasi push belum lengkap. Hubungi admin.");
    } else {
      toast.error("Gagal mengaktifkan notifikasi. Coba lagi.");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="mx-auto flex w-full max-w-3xl items-center gap-3 border-b border-primary/20 bg-primary/5 px-3 py-2 text-xs sm:rounded-lg sm:border sm:px-4 sm:py-2.5"
      >
        {iosNeedsInstall ? (
          <Smartphone className="h-4 w-4 shrink-0 text-primary" />
        ) : (
          <Bell className="h-4 w-4 shrink-0 text-primary" />
        )}
        <p className="min-w-0 flex-1 leading-snug">
          {iosNeedsInstall ? (
            <>
              Pasang ke layar utama: fullscreen, baca lebih nyaman, & notifikasi
              langsung ke HP.{" "}
              <span className="font-semibold">Share → Add to Home Screen</span>.
            </>
          ) : (
            <>
              Aktifkan notifikasi agar tidak melewatkan balasan support.
            </>
          )}
        </p>
        {!iosNeedsInstall && (
          <Button
            size="sm"
            className="h-7 px-2.5 text-[11px]"
            onClick={handleEnable}
            disabled={busy}
          >
            {busy ? "Mengaktifkan…" : "Aktifkan"}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDismiss}
          aria-label="Tutup"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}
