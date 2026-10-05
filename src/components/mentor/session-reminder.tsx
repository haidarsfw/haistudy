"use client";

import { useEffect, useState } from "react";
import { format, isToday, isTomorrow } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import { CalendarClock, X } from "@/components/ui/icons";

import { Button } from "@/components/ui/button";
import { useSession } from "@/components/providers/session-provider";
import {
  INTERRUPTION_PRIORITY,
  useInterruptionSlot,
} from "@/components/providers/interruption-provider";
import type { GroupSession } from "@/lib/mentor/sessions";

type Upcoming = GroupSession & { groupName: string };
/** "day" = within 24 hours; "soon" = the last hour, and while it runs. */
type Stage = "day" | "soon";

const DISMISS_PREFIX = "hs-session-reminder:";

function dismissed(id: string, stage: Stage): boolean {
  try {
    return localStorage.getItem(`${DISMISS_PREFIX}${id}:${stage}`) === "1";
  } catch {
    return false;
  }
}

function stageOf(s: Upcoming, now: number): Stage | null {
  const start = Date.parse(s.startsAt);
  const end = start + s.durationMinutes * 60_000;
  if (now >= end) return null;
  if (start - now <= 60 * 60_000) return "soon";
  if (start - now <= 24 * 3600_000) return "day";
  return null;
}

/** "hari ini 19.00", "besok 19.00", "dalam 40 menit", or "sedang berlangsung". */
function whenLabel(s: Upcoming, now: number): string {
  const start = new Date(s.startsAt);
  const mins = Math.round((start.getTime() - now) / 60_000);
  if (mins <= 0) return "sedang berlangsung";
  if (mins <= 60) return `dalam ${mins} menit`;
  const time = format(start, "HH.mm");
  if (isToday(start)) return `hari ini ${time}`;
  if (isTomorrow(start)) return `besok ${time}`;
  return format(start, "EEE HH.mm", { locale: idLocale });
}

/**
 * Session reminders, H-1 and H-1 jam, inside the app: a banner for a session
 * within the next 24 hours, and again in its last hour (and while it runs)
 * even if the first one was closed. No push and no cron behind it (the owner
 * chose no push; the Hobby plan's crons run daily at most).
 *
 * The sessions are read once when the app opens; the stage is then worked out
 * locally once a minute, so an open tab moves from "besok" to "dalam 40 menit"
 * without asking the server anything.
 */
export function SessionReminder() {
  const { session } = useSession();
  const [sessions, setSessions] = useState<Upcoming[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [closedTick, setClosedTick] = useState(0);

  useEffect(() => {
    if (!session?.inGroup) return;
    let alive = true;
    fetch("/api/mentor/sessions/upcoming", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { sessions: [] }))
      .then((b: { sessions?: Upcoming[] }) => alive && setSessions(b.sessions ?? []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [session?.inGroup]);

  useEffect(() => {
    if (!sessions.length) return;
    const id = setInterval(() => {
      if (!document.hidden) setNow(Date.now());
    }, 60_000);
    return () => clearInterval(id);
  }, [sessions.length]);

  void closedTick; // re-read dismissals after a close
  const next = sessions
    .map((s) => ({ s, stage: stageOf(s, now) }))
    .find((x): x is { s: Upcoming; stage: Stage } => x.stage !== null && !dismissed(x.s.id, x.stage));

  // Claimed before any early return: a hook that only runs on some renders
  // breaks the order React relies on.
  const { granted } = useInterruptionSlot("session-reminder", {
    lane: "banner",
    priority: INTERRUPTION_PRIORITY.sessionReminder,
    ready: Boolean(next),
  });
  if (!next || !granted) return null;

  const close = () => {
    try {
      localStorage.setItem(`${DISMISS_PREFIX}${next.s.id}:${next.stage}`, "1");
    } catch {
      /* private mode: it simply shows again next time */
    }
    setClosedTick((t) => t + 1);
  };
  const link = next.s.place && /^https?:\/\//.test(next.s.place) ? next.s.place : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl items-center gap-3 border-b border-primary/20 bg-primary/5 px-3 py-2 text-xs sm:rounded-lg sm:border sm:px-4 sm:py-2.5">
      <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
      <p className="min-w-0 flex-1 leading-snug">
        <span className="font-semibold">Sesi mentoring {whenLabel(next.s, now)}</span>: {next.s.title}
        {next.s.groupName ? ` · ${next.s.groupName}` : ""}
        {next.s.place && !link ? ` · ${next.s.place}` : ""}
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
