"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { popupOverlay, popupPanel } from "@/lib/motion";
import { ClipboardList, Gift, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FEEDBACK_FORM_URL } from "@/lib/feedback-form";
import { useSession } from "@/components/providers/session-provider";

// Post-UAS feedback nudge. Shows once per login session (sessionStorage-gated,
// so page refreshes and SPA navigation don't re-trigger it) — a new browser
// session (i.e. a fresh login) surfaces it again, per the owner's intent.
// Scope-gating (s2-uas-bm only) is done by the caller (app-shell conditional
// mount), so this component itself carries no scope logic.
// Purely client-side: no DB / API / realtime → zero free-tier cost.
const STORAGE_KEY = "hs-feedback-uasbm-session";
const SHOW_DELAY_MS = 1500;
// Same key the onboarding tour writes (see @/hooks/use-onboarding).
const ONBOARDING_KEY = "hs-onboarding-complete";

export function SurveyPopup() {
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const licenseKey = session?.licenseKey;

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // If sessionStorage is unavailable, skip popup to avoid spamming
      return;
    }
    if (seen) return;

    // Wait for the onboarding tour. Two things were wrong without this: on a
    // phone the tour rendered ON TOP of this panel, so a brand-new user's first
    // screen was two stacked dialogs; and the copy thanks them for a period
    // they have not used yet, because the only gate was the scope.
    // Someone who has finished the tour has at least been inside the app.
    try {
      const done =
        localStorage.getItem(`${ONBOARDING_KEY}:${licenseKey ?? ""}`) ??
        localStorage.getItem(ONBOARDING_KEY);
      if (!done) return;
    } catch {
      // localStorage unavailable — treat as "tour not finished" and stay quiet.
      return;
    }

    const timer = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [licenseKey]);

  const markSeen = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  };

  const dismiss = () => {
    markSeen();
    setOpen(false);
  };

  const handleSubmit = () => {
    markSeen();
    window.open(FEEDBACK_FORM_URL, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={popupOverlay}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-background/70 backdrop-blur-sm px-4"
          onClick={dismiss}
        >
          <motion.div
            variants={popupPanel}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-labelledby="survey-popup-title"
            className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={dismiss}
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2
                  id="survey-popup-title"
                  className="font-heading text-base font-semibold leading-snug"
                >
                  Masukanmu buat haistudy
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-foreground">
                  Makasih udah pakai haistudy selama UAS Semester 2 BM! Bantu kami
                  jadi lebih baik lewat form singkat, cuma 2–3 menit. Masukanmu —
                  pujian atau kritik — langsung nentuin fitur mana yang dibenahi
                  duluan.
                </p>
              </div>
            </div>

            {/* Voucher highlight — the sweetener */}
            <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
              <Gift className="h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs leading-snug text-foreground">
                Yang isi sampai selesai dapat{" "}
                <span className="font-semibold text-primary">
                  voucher diskon 15%
                </span>{" "}
                untuk pembelian berikutnya.
              </p>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" size="sm" onClick={dismiss}>
                Nanti
              </Button>
              <Button size="sm" onClick={handleSubmit} className="gap-1.5">
                Isi Form
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
