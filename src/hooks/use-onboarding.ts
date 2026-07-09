"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ONBOARDING_STEPS } from "@/lib/onboarding-steps";
import { useSession } from "@/components/providers/session-provider";
import { PWA_EVENTS, ONBOARDING_DONE_SESSION_KEY } from "@/lib/pwa-version";

const STORAGE_KEY = "hs-onboarding-complete";

export type PostPhase = "none" | "contact-form" | "settings-setup";

export function useOnboarding() {
  const { session } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [shouldShow, setShouldShow] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [postPhase, setPostPhase] = useState<PostPhase>("none");

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
            return; // done elsewhere → never show here
          }
        }
        if (!cancelled) setShouldShow(true);
      } catch {
        // Network error → show it; localStorage still gates repeats on this device.
        if (!cancelled) setShouldShow(true);
      }
    })();
    return () => {
      cancelled = true;
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
      return isMobile && s?.skipOnMobile === true;
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
        setPostPhase("contact-form");
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

  const complete = useCallback(() => {
    persistComplete();
    setShouldShow(false);
    setPostPhase("contact-form");
  }, [persistComplete]);

  const advancePostPhase = useCallback(() => {
    setPostPhase((current) => {
      if (current === "contact-form") return "settings-setup";
      return "none";
    });
  }, []);

  // Fire ONBOARDING_DONE exactly once, when the whole flow (tutorial + post
  // phases) ends. The install banner waits for this on a first login so it
  // never overlaps the tutorial spotlight. Side-effect lives in an effect (not
  // the setState updater) so React strict-mode double-invocation can't dupe it.
  const wasInPostPhase = useRef(false);
  useEffect(() => {
    if (postPhase === "contact-form" || postPhase === "settings-setup") {
      wasInPostPhase.current = true;
    } else if (postPhase === "none" && wasInPostPhase.current) {
      wasInPostPhase.current = false;
      try {
        sessionStorage.setItem(ONBOARDING_DONE_SESSION_KEY, "1");
        window.dispatchEvent(new Event(PWA_EVENTS.ONBOARDING_DONE));
      } catch {
        // storage / dispatch unavailable
      }
    }
  }, [postPhase]);

  return {
    shouldShow,
    currentStep,
    step: ONBOARDING_STEPS[currentStep],
    totalSteps: ONBOARDING_STEPS.length,
    isMobile,
    next,
    prev,
    complete,
    postPhase,
    advancePostPhase,
  };
}
