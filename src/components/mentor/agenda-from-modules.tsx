"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "@/components/ui/icons";

import { Button } from "@/components/ui/button";
import { loadCourses, loadRangkuman } from "@/data";
import { moduleIdOf } from "@/lib/mentor/modules";
import type { AgendaItem } from "@/lib/mentor/sessions";
import type { ExamPeriod } from "@/types/scope";
import { cn } from "@/lib/utils";

interface SubjectModules {
  id: string;
  name: string;
  modules: string[];
}

/** What the group already did with a module, from its sessions. */
export type ModuleState = "scheduled" | "done";

/**
 * The agenda template for a subject: its Rangkuman modules, ticked into agenda
 * points. Each point carries its subject and module id, so members see the
 * module as "dijadwalkan" as soon as the session is saved, exactly like a
 * point that came from "Usulan anggota".
 *
 * The list is the Rangkuman of the period the group TEACHES, loaded in the
 * browser only when the mentor opens this: static chunks, no server call.
 * Modules the group already covered or scheduled say so, which is what makes
 * it a plan rather than a copy of the table of contents.
 */
export function AgendaFromModules({
  semester,
  examPeriod,
  jurusan,
  taken,
  states,
  onAdd,
}: {
  semester: number;
  examPeriod: ExamPeriod;
  jurusan: string;
  /** "subjectId/moduleId" already on this session's agenda. */
  taken: Set<string>;
  states: Map<string, ModuleState>;
  onAdd: (items: AgendaItem[]) => void;
}) {
  const [subjects, setSubjects] = useState<SubjectModules[] | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [picked, setPicked] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let alive = true;
    const scope = { semester, examPeriod, jurusan };
    Promise.all([loadCourses(scope), loadRangkuman(scope)])
      .then(([courses, rangkuman]) => {
        const map = (rangkuman ?? {}) as Record<string, Record<string, string>>;
        const list = courses
          .map((c) => ({ id: c.id, name: c.name, modules: Object.keys(map[c.id] ?? {}) }))
          .filter((s) => s.modules.length > 0);
        if (!alive) return;
        setSubjects(list);
        setSubjectId(list[0]?.id ?? "");
      })
      .catch(() => alive && setSubjects([]));
    return () => {
      alive = false;
    };
  }, [semester, examPeriod, jurusan]);

  if (subjects === null) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat daftar modul
      </p>
    );
  }
  if (subjects.length === 0) {
    return <p className="text-xs text-muted-foreground">Periode ini belum punya modul Rangkuman.</p>;
  }

  const subject = subjects.find((s) => s.id === subjectId) ?? subjects[0];
  const keyOf = (title: string) => `${subject.id}/${moduleIdOf(title)}`;
  const toggle = (key: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const chosen = subject.modules.filter((m) => picked.has(keyOf(m)) && !taken.has(keyOf(m)));

  return (
    <div className="space-y-2 rounded-lg bg-muted/40 p-2.5">
      <label className="block text-xs font-medium text-foreground">
        Mata kuliah
        <select
          value={subject.id}
          onChange={(e) => {
            setSubjectId(e.target.value);
            setPicked(new Set());
          }}
          className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <ul className="space-y-0.5">
        {subject.modules.map((title) => {
          const key = keyOf(title);
          const onAgenda = taken.has(key);
          const state = states.get(key);
          return (
            <li key={key}>
              <label
                className={cn(
                  "flex min-h-11 items-center gap-2.5 rounded-md px-1.5 text-sm",
                  onAgenda ? "text-muted-foreground" : "cursor-pointer text-foreground hover:bg-background"
                )}
              >
                <input
                  type="checkbox"
                  checked={onAgenda || picked.has(key)}
                  disabled={onAgenda}
                  onChange={() => toggle(key)}
                  className="h-4 w-4 shrink-0 accent-primary"
                />
                <span className="min-w-0 flex-1">{title}</span>
                {onAgenda ? (
                  <span className="shrink-0 text-[11px]">di agenda ini</span>
                ) : state ? (
                  <span className={cn("shrink-0 text-[11px]", state === "done" ? "text-primary" : "text-muted-foreground")}>
                    {state === "done" ? "sudah dibahas" : "dijadwalkan"}
                  </span>
                ) : null}
              </label>
            </li>
          );
        })}
      </ul>
      <Button
        variant="outline"
        className="h-11"
        disabled={chosen.length === 0}
        onClick={() => {
          onAdd(
            chosen.map((title) => ({
              text: `${subject.name} · ${title}`,
              subjectId: subject.id,
              module: moduleIdOf(title),
            }))
          );
          setPicked(new Set());
        }}
      >
        {chosen.length > 0 ? `Tambahkan ${chosen.length} modul ke agenda` : "Pilih modulnya dulu"}
      </Button>
    </div>
  );
}
