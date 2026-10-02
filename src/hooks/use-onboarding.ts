"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ONBOARDING_STEPS, resolveStepTarget } from "@/lib/onboarding-steps";
import { useSession } from "@/components/providers/session-provider";
import { PWA_EVENTS, ONBOARDING_DONE_SESSION_KEY } from "@/lib/pwa-version";

const STORAGE_KEY = "hs-onboarding-complete";

export function useOnboarding() {
  const { session } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [shouldShow, setShouldShow] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // True while the server is still being asked whether this account finished
  // the tour elsewhere. The interruption queue holds the modal lane open for
  // that answer; otherwise whether the tutorial or the release note comes
  // first on a first login would come down to which fetch returned faster.
  const [deciding, setDeciding] = useState(false);

  const storageKey = session?.licenseKey
    ? `hs-onboarding-${session.licenseKey}`
    : STORAGE_KEY;

  // Mark the tour done: localStorage (instant cache on THIS device) + server
  // (per-account, so it stays done across ALL of the user's devices).
  const persistComplete = useCallback(() => {
    try {
      localStorage.setItem(storageKey, new Date().toISOString());
    } catch {}
    fetch("/api/onboarding", {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => {});
  }, [storageKey]);

  useEffect(() => {
    if (!session) return;
    if (session.isPreview) return;
    // Tester/QA accounts skip the onboarding tour entirely (it otherwise blocks
    // automated E2E runs and adds no value for internal accounts).
    if (session.isTester) return;

    let cancelled = false;
    // Fast path: already completed on THIS device (instant, no flash/refetch).
    try {
      if (localStorage.getItem(storageKey)) return;
    } catch {
      // localStorage unavailable — fall through to the server check.
    }
    // Not cached locally → ask the server whether the ACCOUNT already finished
    // the tour on another device (cross-device, once-only). Cache the answer.
    setDeciding(true);
    (async () => {
      try {
        const res = await fetch("/api/onboarding", { credentials: "same-origin" });
        if (cancelled) return;
        if (res.ok) {
          const { completed } = (await res.json()) as { completed?: boolean };
          if (completed) {
            try {
              localStorage.setItem(storageKey, new Date().toISOString());
            } catch {}
            setDeciding(false);
            return; // done elsewhere → never show here
          }
        }
        if (!cancelled) {
          setShouldShow(true);
          setDeciding(false);
        }
      } catch {
        // Network error → show it; localStorage still gates repeats on this device.
        if (!cancelled) {
          setShouldShow(true);
          setDeciding(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      // A cancelled check must not leave the lane held. `session` changes
      // identity whenever something calls updateSession (the class label does,
      // on load), which cancels the request in flight; a re-run that then takes
      // an early return would otherwise leave `deciding` true for the whole
      // session, and the queue would keep every other popup waiting on a
      // tutorial that is never coming.
      setDeciding(false);
    };
  }, [session, storageKey]);

  // Track mobile state
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const shouldSkip = useCallback(
    (stepIndex: number) => {
      const s = ONBOARDING_STEPS[stepIndex];
      if (isMobile && s?.skipOnMobile === true) return true;
      // A step whose element is not on the page explains nothing: the overlay
      // would darken the screen and point its arrow at empty space. That happens
      // for real — the "here are your subjects" card does not render in a period
      // whose material has not been written yet. Skip it instead.
      const target = resolveStepTarget(s, isMobile);
      if (target && typeof document !== "undefined" && !document.querySelector(target)) {
        return true;
      }
      return false;
    },
    [isMobile]
  );

  const next = useCallback(() => {
    setCurrentStep((prev) => {
      let nextStep = prev + 1;
      // Skip mobile-hidden steps
      while (nextStep < ONBOARDING_STEPS.length && shouldSkip(nextStep)) {
        nextStep++;
      }
      if (nextStep >= ONBOARDING_STEPS.length) {
        persistComplete();
        setShouldShow(false);
        return prev;
      }
      return nextStep;
    });
  }, [shouldSkip, persistComplete]);

  const prev = useCallback(() => {
    setCurrentStep((p) => {
      let prevStep = p - 1;
      while (prevStep >= 0 && shouldSkip(prevStep)) {
        prevStep--;
      }
      return prevStep >= 0 ? prevStep : p;
    });
  }, [shouldSkip]);

  /**
   * "Lewati" — out, and out of the whole thing.
   *
   * Finishing and skipping now end in the same place, which they did not
   * before: the tour used to hand whoever reached the end two more forms, a
   * contact form and a settings pass. Both were already editable from the
   * profile popover and from Settings, and arriving at them by pressing
   * "Selesai" read as a refusal to take no for an answer. The tour is the one
   * interruption a first login gets.
   */
  const skip = useCallback(() => {
    persistComplete();
    setShouldShow(false);
  }, [persistComplete]);

  // Announce the end of the tour exactly once. The install prompt listens for
  // this so it never lands on top of the spotlight; the interruption queue is
  // what actually keeps it from showing in the same entry. Side effect lives in
  // an effect, not in a setState updater, so strict mode cannot double-fire it.
  const wasShowing = useRef(false);
  useEffect(() => {
    if (shouldShow) {
      wasShowing.current = true;
      return;
    }
    if (!wasShowing.current) return;
    wasShowing.current = false;
    try {
      sessionStorage.setItem(ONBOARDING_DONE_SESSION_KEY, "1");
      window.dispatchEvent(new Event(PWA_EVENTS.ONBOARDING_DONE));
    } catch {
      // storage / dispatch unavailable
    }
  }, [shouldShow]);

  return {
    shouldShow,
    deciding,
    currentStep,
    step: ONBOARDING_STEPS[currentStep],
    totalSteps: ONBOARDING_STEPS.length,
    isMobile,
    next,
    prev,
    skip,
  };
}
