"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  Share,
  PlusSquare,
  Zap,
  BookOpen,
  BellRing,
  Sparkles,
  MoreVertical,
  Smartphone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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

declare global {
  interface Window {
    // Captured globally + early in layout.tsx (before hydration) so a
    // beforeinstallprompt that fires pre-mount is never lost.
    __hsBIP?: BeforeInstallPromptEvent | null;
  }
}

export function InstallBanner() {
  const { t } = useTranslation();
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  // Pure client check; lazy init avoids a setState-in-effect.
  const [isIos] = useState(() => isIosSafari());
  // Whether a native install prompt is available (drives the Pasang button).
  const [hasPrompt, setHasPrompt] = useState(false);
  // Android/desktop with no native prompt: tapping "Pasang" reveals the manual
  // steps inline instead of silently closing (Item 10 fix).
  const [manualOpen, setManualOpen] = useState(false);
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

    // Seed from the global early-capture (layout.tsx) so a prompt fired before
    // this component mounted (e.g. before login) is still usable.
    if (typeof window !== "undefined" && window.__hsBIP) {
      deferredPrompt.current = window.__hsBIP;
      setHasPrompt(true);
    }

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
      if (typeof window !== "undefined") window.__hsBIP = e as BeforeInstallPromptEvent;
      setHasPrompt(true);
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
      if (typeof window !== "undefined") window.__hsBIP = null;
      setHasPrompt(false);
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

  // "Nanti saja" - silent until the next SW_VERSION bump.
  const close = () => {
    dismissInstallUntilNextVersion();
    setOpen(false);
  };

  const handleInstall = async () => {
    sounds.click();
    const dp =
      deferredPrompt.current ??
      (typeof window !== "undefined" ? window.__hsBIP ?? null : null);
    if (dp) {
      try {
        await dp.prompt();
        await dp.userChoice;
      } catch {
        // user dismissed the native sheet - ignore
      }
      deferredPrompt.current = null;
      if (typeof window !== "undefined") window.__hsBIP = null;
      setHasPrompt(false);
      setOpen(false);
      return;
    }
    // No native prompt and not iOS: reveal the manual steps inline instead of
    // silently closing (the old bug). The user installs via the browser menu.
    setManualOpen(true);
  };

  const benefits = [
    { icon: Zap, text: t("pwa.benefit_fast") },
    { icon: BellRing, text: t("pwa.benefit_notif") },
    { icon: BookOpen, text: t("pwa.benefit_readability") },
    { icon: Sparkles, text: t("pwa.benefit_exclusive") },
  ];

  // Android steps appear after the user taps "Pasang" with no native prompt.
  const showAndroidSteps = !isIos && manualOpen;
  // On iOS the button is an instruction acknowledgement; same once Android
  // manual steps are revealed.
  const showGotIt = isIos || manualOpen;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent
        showCloseButton={false}
        className="max-w-sm bg-background/90 backdrop-blur-xl border-border/30 data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-[0.96]"
      >
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
        <ul className="space-y-2.5">
          {benefits.map((b, i) => (
            <li key={i} className="flex items-center gap-3 text-sm font-medium text-foreground">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <b.icon className="h-4 w-4" />
              </span>
              <span className="leading-snug">{b.text}</span>
            </li>
          ))}
        </ul>

        {/* Reassurance note */}
        <p className="rounded-lg bg-primary/5 px-3 py-2 text-center text-xs font-medium text-primary ring-1 ring-primary/10">
          {t("pwa.install_note")}
        </p>

        {isIos && (
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
        )}

        {showAndroidSteps && (
          /* Android / desktop fallback when no native prompt is available */
          <div className="space-y-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">{t("pwa.install_android_title")}</p>
            <p className="flex items-center gap-2">
              <MoreVertical className="h-4 w-4 shrink-0 text-primary" />
              {t("pwa.install_android_step1")}
            </p>
            <p className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 shrink-0 text-primary" />
              {t("pwa.install_android_step2")}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={close}>
            {t("pwa.install_later")}
          </Button>
          {showGotIt ? (
            <Button className="flex-1" onClick={close}>
              {t("pwa.got_it")}
            </Button>
          ) : (
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
