"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ScrollText,
  Loader2,
  RefreshCw,
  Clock,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  Bot,
  Copy,
  X,
} from "lucide-react";
import { useAdminScope } from "@/components/providers/admin-scope-provider";
import { adminFetch } from "@/lib/admin/admin-fetch";
import { AdminErrorBanner } from "@/components/admin/admin-error-banner";
import { InlineSearch } from "@/components/admin/inline-search";
import { useTranslation } from "@/components/providers/language-provider";
import { ReviewCard } from "@/components/exam/exam-results";
import { loadCourses, loadExamData } from "@/data";
import { parseScopeKey } from "@/lib/scope";
import type {
  AdminAttemptSummary,
  AdminAttemptDetail,
  ExamData,
} from "@/types/exam";

const TOP_N = 10;

// ─── Check (AI + plagiarism) response shapes ───
interface CheckPerQuestion {
  plagPct: number;
  plagTooShort: boolean;
  aiLikelihood: number | null;
  aiAssessed: boolean;
  aiLlmUsed: boolean;
  reason: string;
}
interface CheckResult {
  overall: {
    aiPct: number | null;
    plagPct: number | null;
    answered: number;
    aiLlmUsed: number;
    materiAvailable: boolean;
    aiConfigured: boolean;
  };
  perQuestion: Record<string, CheckPerQuestion>;
}

// ─── Formatters ───
function fmtPct(p: number | null): string {
  return p == null ? "—" : `${Math.round(p)}%`;
}
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtDuration(sec: number | null): string {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}
function rankColor(i: number): string {
  return i === 0
    ? "text-yellow-500"
    : i === 1
      ? "text-gray-400"
      : i === 2
        ? "text-amber-600"
        : "text-muted-foreground";
}
// Higher = worse (more likely AI / more copied).
function pctTone(p: number | null): string {
  if (p == null) return "text-muted-foreground";
  if (p >= 70) return "text-red-500";
  if (p >= 40) return "text-amber-500";
  return "text-emerald-500";
}

// ─── One leaderboard row (one attempt — never merged). ───
function AttemptRow({
  attempt,
  index,
  subjectLabel,
  showScope,
  onClick,
}: {
  attempt: AdminAttemptSummary;
  index: number;
  subjectLabel: string;
  showScope: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/50"
    >
      <span
        className={`w-6 shrink-0 text-center text-sm font-bold ${rankColor(index)}`}
      >
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{attempt.userName}</p>
        <p className="truncate text-[10px] text-muted-foreground">
          {subjectLabel}
          {showScope && attempt.semester != null && (
            <span className="font-mono">
              {" · "}s{attempt.semester}-{attempt.examPeriod}-{attempt.jurusan}
            </span>
          )}
          {" · "}
          {fmtDate(attempt.submittedAt ?? attempt.createdAt)}
        </p>
      </div>
      <Badge variant="secondary" className="shrink-0 font-mono text-xs">
        {fmtPct(attempt.scorePct)}
      </Badge>
    </button>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="font-semibold uppercase tracking-wide text-muted-foreground/70">
        {label}
      </p>
      <p className="truncate text-foreground/90" title={value}>
        {value}
      </p>
    </div>
  );
}

/**
 * Admin "Top Latihan Soal Score" leaderboard. Renders below the Quiz /
 * Most-Active cards in the Statistik tab.
 *
 * Cost note: read-only list, fetched ONCE per scope change (no poll). Per-
 * question detail + the optional "Cek" (AI + plagiarism) run only on click.
 */
export function ExamScoreLeaderboard() {
  const { adminScopeKey, isAllPeriods, scopeQuery, hydrated } = useAdminScope();
  const { t } = useTranslation();

  const [attempts, setAttempts] = useState<AdminAttemptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subjectLabels, setSubjectLabels] = useState<Record<string, string>>({});

  // Preserve window scroll across a subject-filter change (the Select close /
  // list reflow otherwise jumps the page to the top).
  const pendingScroll = useRef<number | null>(null);
  const changeSubject = (v: string | null) => {
    pendingScroll.current = window.scrollY;
    setSubjectFilter(v ?? "all");
  };
  useLayoutEffect(() => {
    const y = pendingScroll.current;
    if (y == null) return;
    window.scrollTo(0, y);
    const raf = requestAnimationFrame(() => {
      window.scrollTo(0, y);
      pendingScroll.current = null;
    });
    return () => cancelAnimationFrame(raf);
  }, [subjectFilter]);

  // ─── Fetch list once per scope change (NO poll). ───
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    setLoading(true);
    adminFetch<{ attempts?: AdminAttemptSummary[] }>(
      `/api/admin/exam-attempts${scopeQuery()}`
    )
      .then((data) => {
        if (cancelled) return;
        setAttempts(data.attempts ?? []);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, adminScopeKey, scopeQuery, reloadToken]);

  // ─── Subject id -> label, from in-repo course data of every scope present. ───
  useEffect(() => {
    const scopeKeys = Array.from(new Set(attempts.map((a) => a.scopeKey)));
    if (scopeKeys.length === 0) return;
    let cancelled = false;
    Promise.all(
      scopeKeys.map((sk) => {
        const scope = parseScopeKey(sk);
        return scope ? loadCourses(scope).catch(() => []) : Promise.resolve([]);
      })
    ).then((lists) => {
      if (cancelled) return;
      const map: Record<string, string> = {};
      for (const list of lists) for (const c of list) map[c.id] = c.name;
      setSubjectLabels(map);
    });
    return () => {
      cancelled = true;
    };
  }, [attempts]);

  const labelFor = useCallback(
    (subjectId: string) => subjectLabels[subjectId] ?? subjectId,
    [subjectLabels]
  );

  const subjects = useMemo(() => {
    const set = new Set(attempts.map((a) => a.subjectId));
    return Array.from(set).sort((a, b) =>
      labelFor(a).localeCompare(labelFor(b))
    );
  }, [attempts, labelFor]);

  // Filter by subject + search, sort score desc (tiebreak most recent).
  const ranked = useMemo(() => {
    const q = search.trim().toLowerCase();
    return attempts
      .filter((a) => subjectFilter === "all" || a.subjectId === subjectFilter)
      .filter((a) => !q || a.userName.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => {
        const pa = a.scorePct ?? -1;
        const pb = b.scorePct ?? -1;
        if (pb !== pa) return pb - pa;
        const ta = a.submittedAt ? Date.parse(a.submittedAt) : 0;
        const tb = b.submittedAt ? Date.parse(b.submittedAt) : 0;
        return tb - ta;
      });
  }, [attempts, subjectFilter, search]);

  const top = ranked.slice(0, TOP_N);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ScrollText className="h-4 w-4 text-primary" />
              Top Latihan Soal Score
            </CardTitle>
            <div className="flex items-center gap-1.5">
              <InlineSearch value={search} onChange={setSearch} />
              <Select value={subjectFilter} onValueChange={changeSubject}>
                <SelectTrigger className="h-8 w-[150px] text-xs sm:w-[170px]">
                  <SelectValue placeholder="Semua mata kuliah" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua mata kuliah</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s} value={s}>
                      {labelFor(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => setReloadToken((x) => x + 1)}
                title="Muat ulang"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <AdminErrorBanner
              error={error}
              onRetry={() => setReloadToken((x) => x + 1)}
            />
          ) : loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : top.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {search.trim() ? "Tidak ada yang cocok" : "Belum ada data"}
            </p>
          ) : (
            <div className="space-y-1">
              {top.map((a, i) => (
                <AttemptRow
                  key={a.id}
                  attempt={a}
                  index={i}
                  subjectLabel={labelFor(a.subjectId)}
                  showScope={isAllPeriods}
                  onClick={() => setSelectedId(a.id)}
                />
              ))}
            </div>
          )}
          {!loading && !error && ranked.length > TOP_N && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowAll(true)}
            >
              Tampilkan Semua ({ranked.length})
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Show-all dialog */}
      <Dialog open={showAll} onOpenChange={setShowAll}>
        <DialogContent className="max-h-[85vh] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-primary" />
              Top Latihan Soal Score
            </DialogTitle>
            <DialogDescription>
              Semua attempt
              {subjectFilter === "all" ? "" : ` · ${labelFor(subjectFilter)}`}
              {search.trim() ? ` · "${search.trim()}"` : ""}, diurut dari skor
              tertinggi
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-1 overflow-y-auto overscroll-contain pr-1">
            {ranked.map((a, i) => (
              <AttemptRow
                key={a.id}
                attempt={a}
                index={i}
                subjectLabel={labelFor(a.subjectId)}
                showScope={isAllPeriods}
                onClick={() => setSelectedId(a.id)}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <AttemptDetailDialog
        attemptId={selectedId}
        onClose={() => setSelectedId(null)}
        labelFor={labelFor}
        t={t}
      />
    </>
  );
}

/** Full read-only detail for one attempt (meta + per-question breakdown). */
function AttemptDetailDialog({
  attemptId,
  onClose,
  labelFor,
  t,
}: {
  attemptId: string | null;
  onClose: () => void;
  labelFor: (id: string) => string;
  t: (key: string) => string;
}) {
  const [detail, setDetail] = useState<AdminAttemptDetail | null>(null);
  const [exam, setExam] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  // "Cek" (AI + plagiarism) state.
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!attemptId) {
      setDetail(null);
      setExam(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    setExam(null);
    setActiveIdx(0);
    setCheck(null);
    setCheckError(null);
    setChecking(false);
    (async () => {
      try {
        const data = await adminFetch<{ attempt?: AdminAttemptDetail }>(
          `/api/admin/exam-attempts?id=${encodeURIComponent(attemptId)}`
        );
        if (cancelled) return;
        const att = data.attempt ?? null;
        setDetail(att);
        if (att) {
          const scope = parseScopeKey(att.scope_key);
          if (scope) {
            const ed = (await loadExamData(
              scope,
              att.subject_id
            )) as ExamData | null;
            if (!cancelled) setExam(ed);
          }
        }
      } catch {
        if (!cancelled) setError("Gagal memuat detail attempt.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  const userAnswers = useMemo(() => {
    const m: Record<string, string> = {};
    for (const a of detail?.answers ?? []) {
      if (a.questionId && typeof a.answer === "string") {
        m[a.questionId] = a.answer;
      }
    }
    return m;
  }, [detail]);

  // Order grading results by the exam's question order (1, 1a, 1b, 2 …).
  const orderedResults = useMemo(() => {
    const results = detail?.grading_results ?? [];
    if (!exam) return results;
    const pos = new Map<string, number>();
    let i = 0;
    for (const q of exam.questions) {
      if (q.subQuestions && q.subQuestions.length > 0) {
        for (const s of q.subQuestions) pos.set(s.id, i++);
      } else {
        pos.set(q.id, i++);
      }
    }
    return [...results].sort(
      (a, b) => (pos.get(a.questionId) ?? 1e9) - (pos.get(b.questionId) ?? 1e9)
    );
  }, [detail, exam]);

  // Scroll-spy: track which soal card is at the top of the scroll viewport.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root || orderedResults.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              (a.target as HTMLElement).offsetTop -
              (b.target as HTMLElement).offsetTop
          );
        if (visible[0]) {
          const idx = Number((visible[0].target as HTMLElement).dataset.idx);
          if (!Number.isNaN(idx)) setActiveIdx(idx);
        }
      },
      { root, rootMargin: "-15% 0px -75% 0px", threshold: 0 }
    );
    root.querySelectorAll("[data-soal-card]").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [orderedResults]);

  const goTo = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(orderedResults.length - 1, idx));
      const el = scrollRef.current?.querySelector(
        `[data-idx="${clamped}"]`
      ) as HTMLElement | null;
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveIdx(clamped);
    },
    [orderedResults.length]
  );

  const runCheck = useCallback(async () => {
    if (!attemptId) return;
    setChecking(true);
    setCheckError(null);
    try {
      const res = await adminFetch<CheckResult>("/api/admin/exam-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      setCheck(res);
    } catch {
      setCheckError("Gagal menjalankan cek. Coba lagi.");
    } finally {
      setChecking(false);
    }
  }, [attemptId]);

  const hasNav = Boolean(exam) && orderedResults.length > 0;

  return (
    <Dialog open={attemptId != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[88vh] w-[calc(100%-1.5rem)] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl md:max-w-3xl"
      >
        <DialogHeader className="shrink-0 gap-0 border-b border-border px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2 text-base">
              <ScrollText className="h-4 w-4 text-primary" />
              Detail Attempt
            </DialogTitle>
            <div className="flex items-center gap-1.5">
              {detail && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={runCheck}
                  disabled={checking}
                  title="Cek indikasi AI & kemiripan materi"
                >
                  {checking ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  )}
                  Cek
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground"
                onClick={onClose}
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogDescription className="sr-only">
            Detail lengkap attempt latihan soal
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : detail ? (
          <>
            {/* Fixed soal navigator — flush under the header (not floating). */}
            {hasNav && (
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-2 sm:px-5">
                <span className="text-xs font-medium text-muted-foreground">
                  Soal {Math.min(activeIdx + 1, orderedResults.length)} /{" "}
                  {orderedResults.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => goTo(activeIdx - 1)}
                    disabled={activeIdx <= 0}
                    title="Soal sebelumnya"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => goTo(activeIdx + 1)}
                    disabled={activeIdx >= orderedResults.length - 1}
                    title="Soal berikutnya"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div
              ref={scrollRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
            >
              {/* Meta header */}
              <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">
                    {detail.userName}
                  </p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {detail.license_key} · {labelFor(detail.subject_id)} ·{" "}
                    {detail.exam_id}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-bold tabular-nums text-foreground">
                    {detail.score_pct != null
                      ? `${Math.round(detail.score_pct)}%`
                      : "—"}
                  </p>
                  <p className="text-[11px] tabular-nums text-muted-foreground">
                    {detail.total_score ?? "—"}/{detail.max_score ?? "—"}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                <Meta label="Mulai" value={fmtDateTime(detail.started_at)} />
                <Meta label="Submit" value={fmtDateTime(detail.submitted_at)} />
                <Meta
                  label="Durasi"
                  value={fmtDuration(detail.duration_used_seconds)}
                />
                <Meta
                  label="Bahasa"
                  value={detail.exam_language === "en" ? "English" : "Indonesia"}
                />
              </div>
              {detail.auto_submitted && (
                <Badge variant="secondary" className="mt-3 gap-1 text-[10px]">
                  <Clock className="h-3 w-3" /> Auto-submit (waktu habis)
                </Badge>
              )}

              {/* Cek results (attempt-level, averaged from per-soal) */}
              {checkError && (
                <p className="mt-3 text-xs text-red-500">{checkError}</p>
              )}
              {check && (
                <div className="mt-3 border-t border-border pt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-border bg-background p-2.5">
                      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        <Bot className="h-3 w-3" /> Indikasi AI
                      </p>
                      <p
                        className={`text-xl font-bold tabular-nums ${pctTone(check.overall.aiPct)}`}
                      >
                        {fmtPct(check.overall.aiPct)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-2.5">
                      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        <Copy className="h-3 w-3" /> Mirip materi
                      </p>
                      <p
                        className={`text-xl font-bold tabular-nums ${pctTone(check.overall.plagPct)}`}
                      >
                        {fmtPct(check.overall.plagPct)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                    Rata-rata dari {check.overall.answered} jawaban
                    {check.overall.aiConfigured
                      ? ` · model AI dipakai pada ${check.overall.aiLlmUsed} jawaban panjang (sisanya heuristik)`
                      : " · model AI nonaktif, pakai heuristik saja"}
                    {!check.overall.materiAvailable
                      ? " · materi tidak tersedia untuk cek kemiripan"
                      : ""}
                    . Indikator bantu, bukan bukti final.
                  </p>
                </div>
              )}
            </div>

            {/* Per-question breakdown (same view the student sees) */}
            {!exam ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Data soal untuk mata kuliah ini tidak tersedia, jadi rincian per
                soal tidak bisa ditampilkan.
              </p>
            ) : orderedResults.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Tidak ada hasil penilaian.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {orderedResults.map((r, i) => {
                  const pq = check?.perQuestion[r.questionId];
                  return (
                    <div
                      key={r.questionId}
                      data-soal-card
                      data-idx={i}
                      id={`admincheck-${r.questionId}`}
                      className="scroll-mt-2"
                    >
                      {pq && (
                        <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 font-medium ${pctTone(pq.aiLikelihood)}`}
                            title={
                              (pq.reason || "") +
                              (!pq.aiLlmUsed
                                ? " (heuristik saja — teks pendek)"
                                : "")
                            }
                          >
                            <Bot className="h-3 w-3" />
                            AI {fmtPct(pq.aiLikelihood)}
                            {!pq.aiLlmUsed ? "*" : ""}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 font-medium ${pctTone(pq.plagTooShort ? null : pq.plagPct)}`}
                          >
                            <Copy className="h-3 w-3" />
                            Materi {pq.plagTooShort ? "—" : fmtPct(pq.plagPct)}
                          </span>
                        </div>
                      )}
                      <ReviewCard
                        result={r}
                        exam={exam}
                        userAnswer={userAnswers[r.questionId] ?? ""}
                        examLanguage={detail.exam_language}
                        t={t}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
