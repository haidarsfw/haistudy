"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/components/providers/language-provider";
import type { SupportPresenceState } from "@/types";

interface Props {
  presence: SupportPresenceState;
  className?: string;
  /** Show only the dot (no text) - for conversation list rows. */
  dotOnly?: boolean;
}

function formatLastSeen(iso: string | null, t: (k: string) => string): string {
  if (!iso) return t("support.last_seen_unknown");
  const date = new Date(iso);
  const now = Date.now();
  const ageMs = now - date.getTime();
  const min = Math.floor(ageMs / 60_000);
  if (min < 1) return t("support.last_seen_just_now");
  if (min < 60) return t("support.last_seen_minutes").replace("{n}", String(min));
  const hr = Math.floor(min / 60);
  if (hr < 24) return t("support.last_seen_hours").replace("{n}", String(hr));
  const day = Math.floor(hr / 24);
  if (day < 7) return t("support.last_seen_days").replace("{n}", String(day));
  // Older - show absolute
  return t("support.last_seen_at").replace(
    "{time}",
    date.toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  );
}

export function SupportPresenceBadge({ presence, className, dotOnly }: Props) {
  const { t } = useTranslation();
  // Re-render every minute so "5m ago" stays fresh without backend polling
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const online = presence.online;
  const dotClass = online
    ? "bg-emerald-500"
    : "bg-muted-foreground/40";

  if (dotOnly) {
    return (
      <span
        aria-label={online ? t("support.online") : t("support.offline")}
        className={`inline-block h-2 w-2 rounded-full ${dotClass} ${className ?? ""}`}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] text-muted-foreground ${
        className ?? ""
      }`}
    >
      <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
      {online ? t("support.online") : formatLastSeen(presence.lastSeen, t)}
    </span>
  );
}
