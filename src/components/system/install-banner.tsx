"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "@/components/providers/language-provider";
import { sounds } from "@/lib/sounds";
import {
  PWA_EVENTS,
  INSTALL_SHOWN_KEY,
  isInstallDismissed,
  dismissInstallUntilNextVersion,
  clearInstallDismiss,
  isIosSafari,
  isStandalone,
} from "@/lib/pwa-version";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallBanner() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  // Pure client check; lazy init avoids a setState-in-effect. Safe across
  // hydration because the dialog content only renders once `open` is true.
  const [isIos] = useState(() => isIosSafari());
  const [dontRemind, setDontRemind] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  // Capture beforeinstallprompt; auto-surface once per session unless dismissed.
  useEffect(() => {
    if (isStandalone()) return;

    const ios = isIos;

    const shownThisSession = (() => {
      try {
        return sessionStorage.getItem(INSTALL_SHOWN_KEY) === "1";
      } catch {
        return false;
      }
    })();

    const markShown = () => {
      try {
        sessionStorage.setItem(INSTALL_SHOWN_KEY, "1");
      } catch {}
    };

    const maybeShow = () => {
      if (shownThisSession || isInstallDismissed()) return;
      markShown();
      setOpen(true);
    };

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      maybeShow();
    };

    // Manual trigger from Settings "Install app" button - always shows,
    // ignoring the once-per-session and dismiss guards.
    const onRequest = () => {
      markShown();
      setOpen(true);
    };

    const onInstalled = () => {
      clearInstallDismiss();
      deferredPrompt.current = null;
      setOpen(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener(PWA_EVENTS.INSTALL_REQUEST, onRequest);
    window.addEventListener("appinstalled", onInstalled);

    // iOS has no beforeinstallprompt - surface the manual hint instead.
    if (ios) {
      const id = window.setTimeout(maybeShow, 3000);
      return () => {
        window.clearTimeout(id);
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
        window.removeEventListener(PWA_EVENTS.INSTALL_REQUEST, onRequest);
        window.removeEventListener("appinstalled", onInstalled);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener(PWA_EVENTS.INSTALL_REQUEST, onRequest);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [isIos]);

  const close = () => {
    if (dontRemind) dismissInstallUntilNextVersion();
    setOpen(false);
  };

  const handleInstall = async () => {
    sounds.click();
    const dp = deferredPrompt.current;
    if (!dp) {
      // No native prompt (iOS, or already consumed) - just close; hint stays visible.
      close();
      return;
    }
    try {
      await dp.prompt();
      await dp.userChoice;
    } catch {
      // user dismissed native sheet - ignore
    }
    deferredPrompt.current = null;
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Download className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">{t("pwa.install_title")}</DialogTitle>
          <DialogDescription className="text-center">
            {t("pwa.install_desc")}
          </DialogDescription>
        </DialogHeader>

        {isIos && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <Share className="h-4 w-4 shrink-0" />
            <span>{t("pwa.install_ios_hint")}</span>
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
          <label htmlFor="pwa-dont-remind" className="text-xs text-muted-foreground">
            {t("pwa.install_dont_remind")}
          </label>
          <Switch
            id="pwa-dont-remind"
            checked={dontRemind}
            onCheckedChange={setDontRemind}
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={close}>
            {t("pwa.install_later")}
          </Button>
          {!isIos && (
            <Button className="flex-1" onClick={handleInstall}>
              <Download className="mr-1.5 h-4 w-4" />
              {t("pwa.install_button")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
