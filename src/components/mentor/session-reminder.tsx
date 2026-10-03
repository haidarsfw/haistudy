"use client";

import { useEffect, useState } from "react";
import { format, isToday, isTomorrow } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import { CalendarClock, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSession } from "@/components/providers/session-provider";
import {
  INTERRUPTION_PRIORITY,
  useInterruptionSlot,
} from "@/components/providers/interruption-provider";
import type { GroupSession } from "@/lib/mentor/sessions";

type Upcoming = GroupSession & { groupName: string };

const DISMISS_PREFIX = "hs-session-reminder:";

function dismissed(id: string): boolean {
  try {
    return localStorage.getItem(DISMISS_PREFIX + id) === "1";
  } catch {
    return false;
  }
}

/** "hari ini 19.00", "besok 19.00", or "sedang berlangsung". */
function whenLabel(s: Upcoming): string {
  const start = new Date(s.startsAt);
  if (start.getTime() <= Date.now()) return "sedang berlangsung";
  const time = format(start, "HH.mm");
  if (isToday(start)) return `hari ini ${time}`;
  if (isTomorrow(start)) return `besok ${time}`;
  return format(start, "EEE HH.mm", { locale: idLocale });
}

/**
 * The phase-1 reminder: a banner for a mentoring session within the next 24
 * hours, read when the app opens. No push and no cron behind it (the owner
 * chose no push; the Hobby plan has one cron slot left). One banner at a time
 * through the interruption queue; closing it hides that session for good on
 * this browser.
 */
export function SessionReminder() {
  const { session } = useSession();
  const [next, setNext] = useState<Upcoming | null>(null);

  useEffect(() => {
    if (!session?.inGroup) return;
    let alive = true;
    fetch("/api/mentor/sessions/upcoming", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { sessions: [] }))
      .then((b: { sessions?: Upcoming[] }) => {
        if (!alive) return;
        setNext((b.sessions ?? []).find((s) => !dismissed(s.id)) ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [session?.inGroup]);

  // Claimed before any early return: a hook that only runs on some renders
  // breaks the order React relies on.
  const { granted } = useInterruptionSlot("session-reminder", {
    lane: "banner",
    priority: INTERRUPTION_PRIORITY.sessionReminder,
    ready: next !== null,
  });
  if (!next || !granted) return null;

  const close = () => {
    try {
      localStorage.setItem(DISMISS_PREFIX + next.id, "1");
    } catch {
      /* private mode: it simply shows again next time */
    }
    setNext(null);
  };
  const link = next.place && /^https?:\/\//.test(next.place) ? next.place : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl items-center gap-3 border-b border-primary/20 bg-primary/5 px-3 py-2 text-xs sm:rounded-lg sm:border sm:px-4 sm:py-2.5">
      <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
      <p className="min-w-0 flex-1 leading-snug">
        <span className="font-semibold">Sesi mentoring {whenLabel(next)}</span>: {next.title}
        {next.groupName ? ` · ${next.groupName}` : ""}
        {next.place && !link ? ` · ${next.place}` : ""}
      </p>
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-7 shrink-0 items-center rounded-md bg-primary px-2.5 text-[11px] font-medium text-primary-foreground"
        >
          Buka link
        </a>
      )}
      <Button variant="ghost" size="icon-sm" onClick={close} aria-label="Tutup pengingat">
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
