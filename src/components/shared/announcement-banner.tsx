"use client";

import { useState, useEffect } from "react";
import { X, Info, AlertTriangle, Wrench } from "lucide-react";
import type { Announcement } from "@/types";

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
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((data) => {
        if (data.announcements) {
          setAnnouncements(data.announcements);
        }
      })
      .catch(() => {
        // Silently fail
      });
  }, []);

  const visible = announcements.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-1 px-4 pt-2">
      {visible.map((ann) => {
        const config = TYPE_CONFIG[ann.type];
        const Icon = config.icon;

        return (
          <div
            key={ann.id}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${config.bg} ${config.text}`}
          >
            <Icon className={`h-3.5 w-3.5 shrink-0 ${config.iconColor}`} />
            <span className="flex-1 overflow-hidden break-words">{ann.message}</span>
            <button
              onClick={() =>
                setDismissed((prev) => new Set([...prev, ann.id]))
              }
              className="shrink-0 rounded-full p-1 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
