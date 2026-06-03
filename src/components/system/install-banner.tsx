"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share, PlusSquare, Zap, Home, BellRing } from "lucide-react";
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
import { useSession } from "@/components/providers/session-provider";
import { sounds } from "@/lib/sounds";
import {
  PWA_EVENTS,
  INSTALL_SHOWN_KEY,
  ONBOARDING_DONE_SESSION_KEY,
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
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  // Pure client check; lazy init avoids a setState-in-effect.
  const [isIos] = useState(() => isIosSafari());
  const [dontRemind, setDontRemind] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const licenseKey = session?.licenseKey;

  useEffect(() => {
    if (isStandalone()) return;

    const sget = (k: string) => {
      try {
        return sessionStorage.getItem(k);
      } catch {
        return null;
      }
    };
    const sset = (k: string, v: string) => {
      try {
        sessionStorage.setItem(k, v);
      } catch {}
    };

    // First login = onboarding has never completed for this license key. On a
    // first login the prompt is DEFERRED until the tutorial + post-tutorial
    // finish (ONBOARDING_DONE). Returning users keep the once-per-session
    // behaviour. `gateOpen` is captured in the closure and flipped by the event.
    const firstLogin = (() => {
      if (!licenseKey) return false;
      try {
        return !localStorage.getItem(`hs-onboarding-${licenseKey}`);
      } catch {
        return false;
      }
    })();
    let gateOpen = !firstLogin || sget(ONBOARDING_DONE_SESSION_KEY) === "1";

    const maybeShow = () => {
      if (!gateOpen) return;
      if (sget(INSTALL_SHOWN_KEY) === "1" || isInstallDismissed()) return;
      sset(INSTALL_SHOWN_KEY, "1");
      setOpen(true);
    };

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      maybeShow();
    };

    // Manual trigger from Settings "Install app" - always shows.
    const onRequest = () => {
      sset(INSTALL_SHOWN_KEY, "1");
      setOpen(true);
    };

    const onInstalled = () => {
      clearInstallDismiss();
      deferredPrompt.current = null;
      setOpen(false);
    };

    // First login: surface as soon as onboarding completes.
    const onOnboardingDone = () => {
      gateOpen = true;
      maybeShow();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener(PWA_EVENTS.INSTALL_REQUEST, onRequest);
    window.addEventListener(PWA_EVENTS.ONBOARDING_DONE, onOnboardingDone);
    window.addEventListener("appinstalled", onInstalled);

    // iOS has no beforeinstallprompt - surface the manual hint. Only schedule
    // when the gate is already open; otherwise ONBOARDING_DONE drives it.
    let iosTimer: number | undefined;
    if (isIos && gateOpen) {
      iosTimer = window.setTimeout(maybeShow, 3000);
    }

    return () => {
      if (iosTimer) window.clearTimeout(iosTimer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener(PWA_EVENTS.INSTALL_REQUEST, onRequest);
      window.removeEventListener(PWA_EVENTS.ONBOARDING_DONE, onOnboardingDone);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [isIos, licenseKey]);

  const close = () => {
    if (dontRemind) dismissInstallUntilNextVersion();
    setOpen(false);
  };

  const handleInstall = async () => {
    sounds.click();
    const dp = deferredPrompt.current;
    if (!dp) {
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

  const benefits = [
    { icon: Zap, text: t("pwa.benefit_fast") },
    { icon: Home, text: t("pwa.benefit_home") },
    { icon: BellRing, text: t("pwa.benefit_notif") },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          {/* App mark */}
          <div className="mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
            <span className="font-heading text-lg font-extrabold tracking-tight">
              <span className="text-primary">h</span>s
            </span>
          </div>
          <DialogTitle className="text-center">{t("pwa.install_title")}</DialogTitle>
          <DialogDescription className="text-center">
            {t("pwa.install_desc")}
          </DialogDescription>
        </DialogHeader>

        {/* Benefits */}
        <ul className="space-y-2">
          {benefits.map((b, i) => (
            <li key={i} className="flex items-center gap-2.5 text-sm text-foreground">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <b.icon className="h-3.5 w-3.5" />
              </span>
              {b.text}
            </li>
          ))}
        </ul>

        {isIos ? (
          /* iOS: manual Add-to-Home-Screen steps */
          <div className="space-y-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="flex items-center gap-2">
              <Share className="h-4 w-4 shrink-0 text-primary" />
              {t("pwa.install_ios_step1")}
            </p>
            <p className="flex items-center gap-2">
              <PlusSquare className="h-4 w-4 shrink-0 text-primary" />
              {t("pwa.install_ios_step2")}
            </p>
          </div>
        ) : null}

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
            {isIos ? t("pwa.got_it") : t("pwa.install_later")}
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
