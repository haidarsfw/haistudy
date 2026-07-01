"use client";

import { useState } from "react";
import Link from "next/link";
import { X, Info, AlertTriangle, Wrench, ArrowRight } from "lucide-react";
import { parseAnnouncementCta } from "@/lib/announcement-cta";
import { useAnnouncements } from "@/hooks/use-announcements";

const TYPE_CONFIG = {
  info: {
    icon: Info,
    bg: "bg-blue-500/10 border-blue-500/20",
    text: "text-blue-700 dark:text-blue-300",
    iconColor: "text-blue-500",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-500/10 border-amber-500/20",
    text: "text-amber-700 dark:text-amber-300",
    iconColor: "text-amber-500",
  },
  maintenance: {
    icon: Wrench,
    bg: "bg-orange-500/10 border-orange-500/20",
    text: "text-orange-700 dark:text-orange-300",
    iconColor: "text-orange-500",
  },
};

export function AnnouncementBanner() {
  const announcements = useAnnouncements();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = announcements.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    // Compact: tight padding + smaller text + leading so the welcome notice
    // doesn't eat vertical space, while keeping all of its content.
    <div className="space-y-1 px-4 pt-1.5">
      {visible.map((ann) => {
        const { message, cta, modalOnly } = parseAnnouncementCta(ann.message);
        // Modal-only announcements pop in the center modal, never the banner.
        if (modalOnly) return null;
        const config = TYPE_CONFIG[ann.type];
        const Icon = config.icon;

        return (
          <div
            key={ann.id}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] leading-snug ${config.bg} ${config.text}`}
          >
            <Icon className={`h-3 w-3 shrink-0 ${config.iconColor}`} />
            <span className="flex-1 overflow-hidden break-words">{message}</span>
            {cta && (
              <Link
                href={cta.url}
                className="inline-flex shrink-0 items-center gap-1 rounded-md bg-black/10 px-2 py-0.5 text-[10px] font-medium hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 transition-colors"
              >
                {cta.label}
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
            <button
              onClick={() =>
                setDismissed((prev) => new Set([...prev, ann.id]))
              }
              className="shrink-0 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              aria-label="Tutup pengumuman"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
