"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, ArrowRight, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { parseAnnouncementCta } from "@/lib/announcement-cta";
import type { Announcement } from "@/types";

// Shows the newest active announcement in a centered modal once per user.
// Seen IDs are persisted in localStorage so the modal never re-opens for
// a previously-dismissed announcement. Banner + notification bell still
// keep the message visible after dismissal.
const STORAGE_KEY = "hs-announcement-modal-seen";

function getSeenSet(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function markSeen(id: string) {
  try {
    const set = getSeenSet();
    set.add(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

export function AnnouncementModal() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list = (data.announcements || []) as Announcement[];
        const seen = getSeenSet();
        // Never auto-pop "info" (welcome/general) announcements — those live in
        // the header banner + notification bell only. Reserve the modal for
        // higher-urgency warning/maintenance notices.
        const next =
          list.find((a) => a.type !== "info" && !seen.has(a.id)) ?? null;
        if (next) setAnnouncement(next);
      })
      .catch(() => {
        // silent fail
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = () => {
    if (announcement) markSeen(announcement.id);
    setAnnouncement(null);
  };

  if (!announcement) return null;
  const { message, cta } = parseAnnouncementCta(announcement.message);

  return (
    <AnimatePresence>
      {announcement && (
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
            aria-labelledby="announcement-modal-title"
            className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={dismiss}
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
              aria-label="Tutup pengumuman"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Megaphone className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2
                  id="announcement-modal-title"
                  className="font-heading text-base font-semibold leading-snug"
                >
                  Pengumuman baru
                </h2>
                <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-foreground">
                  {message}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" size="sm" onClick={dismiss}>
                Nanti
              </Button>
              {cta && (
                <Link
                  href={cta.url}
                  onClick={dismiss}
                  className={buttonVariants({ size: "sm" }) + " gap-1.5"}
                >
                  {cta.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
