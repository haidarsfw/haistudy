"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// One-shot survey popup - shows once per login session (sessionStorage-gated,
// so refreshes don't re-trigger). Clearing the session (closing the tab/window
// group) resets the gate. Intentionally separate from AnnouncementModal which
// uses localStorage for permanent dismissal.
const STORAGE_KEY = "hs-survey-popup-dismissed-session";
const SHOW_DELAY_MS = 1500;

export function SurveyPopup() {
  const [open, setOpen] = useState(false);
  const surveyUrl = process.env.NEXT_PUBLIC_SURVEY_URL;

  useEffect(() => {
    if (!surveyUrl) return;
    let seen = false;
    try {
      seen = sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // If sessionStorage is unavailable, skip popup to avoid spamming
      return;
    }
    if (seen) return;
    const timer = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [surveyUrl]);

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
    if (surveyUrl) window.open(surveyUrl, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  if (!surveyUrl) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-background/70 backdrop-blur-sm px-4"
          onClick={dismiss}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.18 }}
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
                  Survei Kepuasan haistudy
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-foreground">
                  Bantu tim haistudy menentukan kelanjutan aplikasi ini ke UAS dan semester berikutnya. Isi survei singkat (3-5 menit) dan dapatkan voucher diskon untuk pembelian berikutnya.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" size="sm" onClick={dismiss}>
                Nanti
              </Button>
              <Button size="sm" onClick={handleSubmit} className="gap-1.5">
                Isi Survei
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
