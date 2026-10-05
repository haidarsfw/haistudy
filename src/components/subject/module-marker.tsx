"use client";

import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import { Bookmark, CalendarClock, CheckCircle2, Circle } from "@/components/ui/icons";

import { toast } from "@/components/ui/toast";
import type { GroupModuleState, MarkStatus } from "@/lib/mentor/modules";
import { cn } from "@/lib/utils";

const OPTIONS: { value: MarkStatus | null; label: string; Icon: typeof Circle }[] = [
  { value: null, label: "Belum dibahas", Icon: Circle },
  { value: "want", label: "Mau dibahas", Icon: Bookmark },
  { value: "done", label: "Sudah dibahas", Icon: CheckCircle2 },
];

/**
 * "Status modul ini": one tap between belum / mau dibahas / sudah dibahas.
 *
 * For someone in a group, "mau dibahas" is also a suggestion to the mentor, and
 * the line under it says what the group did with the module (scheduled for a
 * session, or covered in one). For everyone else it is a personal checklist.
 */
export function ModuleMarker({
  moduleTitle,
  status,
  group,
  inGroup,
  loaded,
  onChange,
}: {
  moduleTitle: string;
  status: MarkStatus | null;
  group: GroupModuleState | undefined;
  inGroup: boolean;
  /** False until the marks are read: then no option is lit. */
  loaded: boolean;
  onChange: (next: MarkStatus | null) => Promise<boolean>;
}) {
  const pick = async (next: MarkStatus | null) => {
    if (next === status) return;
    const ok = await onChange(next);
    if (!ok) toast.error("Penanda belum tersimpan. Coba lagi.");
  };

  return (
    <div className="rounded-xl border border-border px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-xs font-medium text-muted-foreground">Status modul ini</p>
        <div role="radiogroup" aria-label={`Status ${moduleTitle}`} className="flex flex-wrap gap-1.5">
          {OPTIONS.map(({ value, label, Icon }) => {
            const on = loaded && value === status;
            return (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={!loaded}
                onClick={() => void pick(value)}
                className={cn(
                  "flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                  on
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", on && "text-primary")} />
                {label}
              </button>
            );
          })}
        </div>
      </div>
      {group ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5 shrink-0 text-primary" />
          {group.state === "scheduled" ? "Dijadwalkan di sesi" : "Dibahas di sesi"} “{group.sessionTitle}”,{" "}
          {format(new Date(group.startsAt), "EEE d MMM, HH.mm", { locale: idLocale })}
        </p>
      ) : inGroup && status === "want" ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Mentormu melihat ini sebagai usulan untuk sesi berikutnya.
        </p>
      ) : null}
    </div>
  );
}

/** The small mark on a module chip: what is waiting, scheduled, or done. */
export function ChipMark({
  status,
  group,
}: {
  status: MarkStatus | null;
  group: GroupModuleState | undefined;
}) {
  if (group?.state === "scheduled") return <CalendarClock aria-label="dijadwalkan" className="h-3 w-3" />;
  if (status === "done" || group?.state === "done") return <CheckCircle2 aria-label="sudah dibahas" className="h-3 w-3" />;
  if (status === "want") return <Bookmark aria-label="mau dibahas" className="h-3 w-3" />;
  return null;
}
