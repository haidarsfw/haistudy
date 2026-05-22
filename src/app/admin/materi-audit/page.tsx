"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Check, X, Circle, Copy, Filter, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadCourses, loadContent } from "@/data";
import type { MateriItem, Subject, SubjectContent } from "@/types";
import { toast } from "sonner";
import { useAdminScope } from "@/components/providers/admin-scope-provider";
import { scopeKey } from "@/lib/scope";

type AuditStatus = "unchecked" | "correct" | "mismatch";

interface AuditRow {
  subjectId: string;
  subjectName: string;
  id: number;
  title: string;
  session?: string;
  driveId: string;
  type: MateriItem["type"];
  sectionLabel?: string;
}

interface AuditEntry {
  status: AuditStatus;
  note?: string;
}

// Per-scope localStorage key so audit state doesn't bleed across scopes.
const STORAGE_KEY_PREFIX = "hs-materi-audit-v1";

function storageKeyFor(scopeKeyStr: string): string {
  return `${STORAGE_KEY_PREFIX}:${scopeKeyStr}`;
}

function readStore(scopeKeyStr: string): Record<string, AuditEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(storageKeyFor(scopeKeyStr));
    return raw ? (JSON.parse(raw) as Record<string, AuditEntry>) : {};
  } catch {
    return {};
  }
}

function writeStore(scopeKeyStr: string, next: Record<string, AuditEntry>) {
  try {
    localStorage.setItem(storageKeyFor(scopeKeyStr), JSON.stringify(next));
  } catch {}
}

function rowKey(r: AuditRow) {
  return `${r.subjectId}:${r.id}`;
}

function drivePreviewUrl(type: MateriItem["type"], driveId: string): string {
  switch (type) {
    case "drive-gslides":
      return `https://docs.google.com/presentation/d/${driveId}/preview`;
    case "drive-pdf":
      return `https://drive.google.com/file/d/${driveId}/view`;
    case "drive-gdoc":
      return `https://docs.google.com/document/d/${driveId}/preview`;
    default:
      return `https://drive.google.com/file/d/${driveId}/view`;
  }
}

function buildAllRows(
  subjects: Subject[],
  content: Record<string, SubjectContent>
): AuditRow[] {
  const rows: AuditRow[] = [];
  for (const subject of subjects) {
    const block = content[subject.id];
    if (!block) continue;
    for (const m of block.materi) {
      rows.push({
        subjectId: subject.id,
        subjectName: subject.shortName,
        id: m.id,
        title: m.title,
        session: m.session,
        driveId: m.driveId,
        type: m.type,
        sectionLabel: m.sectionLabel,
      });
    }
  }
  return rows;
}

export default function MateriAuditPage() {
  const { adminScope, isAllPeriods, hydrated } = useAdminScope();
  const lockedAllPeriods = hydrated && (isAllPeriods || adminScope === "all");
  const currentScopeKey =
    adminScope === "all" ? "all" : scopeKey(adminScope);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [content, setContent] = useState<Record<string, SubjectContent>>({});
  const [store, setStore] = useState<Record<string, AuditEntry>>({});
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [onlyMismatch, setOnlyMismatch] = useState<boolean>(false);

  // Re-load scope content + audit store when adminScope changes.
  useEffect(() => {
    if (lockedAllPeriods || adminScope === "all") {
      setSubjects([]);
      setContent({});
      setStore({});
      return;
    }
    let cancelled = false;
    Promise.all([
      loadCourses(adminScope),
      loadContent(adminScope) as Promise<Record<string, SubjectContent>>,
    ]).then(([s, c]) => {
      if (cancelled) return;
      setSubjects(s);
      setContent(c);
      setStore(readStore(scopeKey(adminScope)));
    });
    return () => {
      cancelled = true;
    };
  }, [adminScope, lockedAllPeriods]);

  const allRows = useMemo(
    () => buildAllRows(subjects, content),
    [subjects, content]
  );

  const filteredRows = useMemo(() => {
    return allRows.filter((r) => {
      if (subjectFilter !== "all" && r.subjectId !== subjectFilter) return false;
      if (onlyMismatch && store[rowKey(r)]?.status !== "mismatch") return false;
      return true;
    });
  }, [allRows, subjectFilter, onlyMismatch, store]);

  const counts = useMemo(() => {
    let correct = 0,
      mismatch = 0,
      unchecked = 0;
    for (const r of allRows) {
      const s = store[rowKey(r)]?.status ?? "unchecked";
      if (s === "correct") correct++;
      else if (s === "mismatch") mismatch++;
      else unchecked++;
    }
    return { correct, mismatch, unchecked, total: allRows.length };
  }, [allRows, store]);

  const setStatus = useCallback((r: AuditRow, status: AuditStatus) => {
    setStore((prev) => {
      const next = { ...prev };
      const k = rowKey(r);
      const existing = next[k] ?? { status: "unchecked" };
      next[k] = { ...existing, status };
      writeStore(currentScopeKey, next);
      return next;
    });
  }, [currentScopeKey]);

  const setNote = useCallback((r: AuditRow, note: string) => {
    setStore((prev) => {
      const next = { ...prev };
      const k = rowKey(r);
      const existing = next[k] ?? { status: "unchecked" };
      next[k] = { ...existing, note };
      writeStore(currentScopeKey, next);
      return next;
    });
  }, [currentScopeKey]);

  const exportMismatches = useCallback(() => {
    const out = allRows
      .filter((r) => store[rowKey(r)]?.status === "mismatch")
      .map((r) => ({
        subject: r.subjectId,
        id: r.id,
        title: r.title,
        currentDriveId: r.driveId,
        note: store[rowKey(r)]?.note ?? "",
      }));
    navigator.clipboard.writeText(JSON.stringify(out, null, 2));
    toast.success(`Copied ${out.length} mismatched entries to clipboard`);
  }, [allRows, store]);

  const resetAll = useCallback(() => {
    if (!confirm("Reset semua tanda audit? Aksi ini tidak bisa dibatalkan.")) return;
    setStore({});
    writeStore(currentScopeKey, {});
  }, [currentScopeKey]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Button>
        </Link>
        <div>
          <h1 className="font-heading text-xl font-bold">Materi Audit</h1>
          <p className="text-xs text-muted-foreground">
            Verifikasi manual: tiap row buka Drive, bandingkan dengan title, tandai correct/mismatch.
          </p>
        </div>
      </div>

      {lockedAllPeriods && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
          <div>
            <p className="font-semibold text-amber-700 dark:text-amber-400">
              Mode &quot;All periods&quot; aktif
            </p>
            <p className="text-amber-700/80 dark:text-amber-400/80">
              Materi audit terbind ke 1 scope spesifik. Switch scope di admin header dulu untuk mulai audit.
            </p>
          </div>
        </div>
      )}

      <div className="mb-4 grid grid-cols-4 gap-2 rounded-2xl border border-border bg-card p-3 text-center">
        <Stat label="Total" value={counts.total} tone="muted" />
        <Stat label="Correct" value={counts.correct} tone="success" />
        <Stat label="Mismatch" value={counts.mismatch} tone="danger" />
        <Stat label="Unchecked" value={counts.unchecked} tone="warn" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs"
          >
            <option value="all">Semua subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shortName}
              </option>
            ))}
          </select>
        </div>
        <Button
          variant={onlyMismatch ? "default" : "outline"}
          size="sm"
          onClick={() => setOnlyMismatch((v) => !v)}
        >
          {onlyMismatch ? "Hanya mismatch" : "Semua status"}
        </Button>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={resetAll}>
            Reset
          </Button>
          <Button size="sm" onClick={exportMismatches} className="gap-1.5">
            <Copy className="h-3.5 w-3.5" />
            Copy Mismatches ({counts.mismatch})
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {filteredRows.map((r) => {
          const entry = store[rowKey(r)] ?? { status: "unchecked" as const };
          return (
            <div
              key={rowKey(r)}
              className={`rounded-xl border p-3 text-sm ${
                entry.status === "correct"
                  ? "border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/10"
                  : entry.status === "mismatch"
                    ? "border-destructive/40 bg-destructive/5"
                    : "border-border bg-card"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span className="font-semibold text-foreground/80">{r.subjectName}</span>
                    <span>·</span>
                    <span>#{r.id}</span>
                    {r.session && (
                      <>
                        <span>·</span>
                        <span>Sesi {r.session}</span>
                      </>
                    )}
                    {r.sectionLabel && (
                      <>
                        <span>·</span>
                        <span className="text-amber-600">{r.sectionLabel}</span>
                      </>
                    )}
                  </div>
                  <p className="mt-1 font-medium">{r.title}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    {r.driveId}
                  </p>
                </div>
                <a
                  href={drivePreviewUrl(r.type, r.driveId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs hover:bg-muted"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open
                </a>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <StatusButton
                  icon={<Circle className="h-3 w-3" />}
                  label="Unchecked"
                  active={entry.status === "unchecked"}
                  onClick={() => setStatus(r, "unchecked")}
                />
                <StatusButton
                  icon={<Check className="h-3 w-3" />}
                  label="Correct"
                  active={entry.status === "correct"}
                  tone="success"
                  onClick={() => setStatus(r, "correct")}
                />
                <StatusButton
                  icon={<X className="h-3 w-3" />}
                  label="Mismatch"
                  active={entry.status === "mismatch"}
                  tone="danger"
                  onClick={() => setStatus(r, "mismatch")}
                />
                {entry.status === "mismatch" && (
                  <input
                    type="text"
                    placeholder="Catatan (opsional): title Drive sebenarnya?"
                    value={entry.note ?? ""}
                    onChange={(e) => setNote(r, e.target.value)}
                    className="ml-2 h-7 flex-1 min-w-[200px] rounded-md border border-border bg-background px-2 text-xs"
                  />
                )}
              </div>
            </div>
          );
        })}
        {filteredRows.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Tidak ada materi yang sesuai filter.
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "muted" | "success" | "danger" | "warn";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600"
      : tone === "danger"
        ? "text-destructive"
        : tone === "warn"
          ? "text-amber-600"
          : "text-foreground";
  return (
    <div>
      <p className={`font-heading text-xl font-bold tabular-nums ${toneClass}`}>
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}

function StatusButton({
  icon,
  label,
  active,
  tone = "muted",
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  tone?: "muted" | "success" | "danger";
  onClick: () => void;
}) {
  const activeClass =
    tone === "success"
      ? "border-emerald-500 bg-emerald-500 text-white"
      : tone === "danger"
        ? "border-destructive bg-destructive text-white"
        : "border-primary bg-primary text-primary-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
        active ? activeClass : "border-border bg-background hover:bg-muted"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
