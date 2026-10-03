"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface MemberProgress {
  accountId: string;
  name: string;
  hasAccess: boolean;
  overall: number;
  subjects: { id: string; name: string; percent: number }[];
  exam: { attempts: number; avgScore: number | null };
  wants: number;
}

/**
 * "Progres anggota": where each mentee stands in the period the group
 * teaches, in the same numbers their own dashboard shows them. Least
 * progressed first, because that is who the mentor needs to reach.
 */
export function GroupProgress({ groupId }: { groupId: string }) {
  const [members, setMembers] = useState<MemberProgress[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/mentor/groups/${groupId}/progress`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { members: [] }))
      .then((b) => alive && setMembers(b.members ?? []))
      .catch(() => alive && setMembers([]));
    return () => {
      alive = false;
    };
  }, [groupId]);

  if (members === null) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Memuat progres
      </p>
    );
  }
  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada anggota di grup ini.</p>;
  }

  const sorted = [...members].sort(
    (a, b) => Number(b.hasAccess) - Number(a.hasAccess) || a.overall - b.overall
  );
  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {sorted.map((m) => {
        const open = openId === m.accountId;
        return (
          <li key={m.accountId} className="px-3 py-2.5">
            <div className="flex items-center gap-3">
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{m.name}</p>
              {m.hasAccess ? (
                <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{m.overall}%</span>
              ) : (
                <span className="shrink-0 text-xs text-muted-foreground">Belum punya akses periode ini</span>
              )}
            </div>
            {m.hasAccess && (
              <>
                <div
                  className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={m.overall}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progres ${m.name}`}
                >
                  <div className="h-full rounded-full bg-primary" style={{ width: `${m.overall}%` }} />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    Latihan Soal {m.exam.attempts}×
                    {m.exam.avgScore !== null ? ` · rata-rata ${m.exam.avgScore}%` : ""}
                  </span>
                  {m.wants > 0 && <span>{m.wants} modul ingin dibahas</span>}
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : m.accountId)}
                    aria-expanded={open}
                    className="flex min-h-9 items-center gap-1 font-medium text-foreground"
                  >
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
                    Per mata kuliah
                  </button>
                </div>
                {open && (
                  <ul className="mt-1 space-y-1">
                    {m.subjects.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-3 text-xs">
                        <span className="min-w-0 truncate text-foreground">{s.name}</span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">{s.percent}%</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
