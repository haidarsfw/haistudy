"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ScrollText,
  Loader2,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Clock,
  X,
} from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";
import { ReviewCard } from "@/components/exam/exam-results";
import { loadExamData } from "@/data";
import { parseScopeKey } from "@/lib/scope";
import { formatDuration } from "@/lib/format";
import type { AdminAttemptDetail, ExamData } from "@/types/exam";

/** The caller's own attempt detail — same row as admin, minus the joined name. */
type OwnAttemptDetail = Omit<AdminAttemptDetail, "userName">;

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
 * Read-only full detail for ONE of the caller's own practice attempts. Fetches
 * the existing, caller-scoped `/api/exam/history?attemptId=` route (1 row, only
 * on open) and renders the same per-question breakdown the student sees. No
 * regrade/delete, no admin checks. Mirrors the admin detail dialog's responsive
 * shell (flex column + native scroll + fixed soal navigator).
 */
export function AttemptDetailDialog({
  attemptId,
  onClose,
  labelFor,
}: {
  attemptId: string | null;
  onClose: () => void;
  labelFor: (id: string) => string;
}) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "id" ? "id-ID" : "en-US";

  const [detail, setDetail] = useState<OwnAttemptDetail | null>(null);
  const [exam, setExam] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);

  const fmtDateTime = useCallback(
    (iso: string | null) =>
      iso
        ? new Date(iso).toLocaleString(dateLocale, {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—",
    [dateLocale]
  );

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
    (async () => {
      try {
        const res = await fetch(
          `/api/exam/history?attemptId=${encodeURIComponent(attemptId)}`
        );
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as { attempt?: OwnAttemptDetail };
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
        if (!cancelled) setError(t("analytics.detail_error"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attemptId, t]);

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

  // Scroll-spy: track which soal card sits at the top of the viewport.
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
              {t("analytics.detail_title")}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground"
              onClick={onClose}
              aria-label={t("common.close")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="sr-only">
            {t("analytics.detail_title")}
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
                  {t("analytics.question")}{" "}
                  {Math.min(activeIdx + 1, orderedResults.length)} /{" "}
                  {orderedResults.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => goTo(activeIdx - 1)}
                    disabled={activeIdx <= 0}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => goTo(activeIdx + 1)}
                    disabled={activeIdx >= orderedResults.length - 1}
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
                    <p className="truncate text-sm font-bold text-foreground">
                      {labelFor(detail.subject_id)}
                    </p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
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
                  <Meta
                    label={t("analytics.started")}
                    value={fmtDateTime(detail.started_at)}
                  />
                  <Meta
                    label={t("analytics.submitted")}
                    value={fmtDateTime(detail.submitted_at)}
                  />
                  <Meta
                    label={t("exam.duration")}
                    value={
                      detail.duration_used_seconds != null
                        ? formatDuration(detail.duration_used_seconds)
                        : "—"
                    }
                  />
                  <Meta
                    label={t("analytics.language")}
                    value={
                      detail.exam_language === "en" ? "English" : "Indonesia"
                    }
                  />
                </div>
                {detail.auto_submitted && (
                  <Badge variant="secondary" className="mt-3 gap-1 text-[10px]">
                    <Clock className="h-3 w-3" /> {t("analytics.auto")}
                  </Badge>
                )}
              </div>

              {/* Per-question breakdown (same view the student sees) */}
              {!exam ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {t("analytics.no_exam_data")}
                </p>
              ) : orderedResults.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {t("analytics.no_results")}
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {orderedResults.map((r, i) => (
                    <div
                      key={r.questionId}
                      data-soal-card
                      data-idx={i}
                      className="scroll-mt-2"
                    >
                      <ReviewCard
                        result={r}
                        exam={exam}
                        userAnswer={userAnswers[r.questionId] ?? ""}
                        examLanguage={detail.exam_language}
                        t={t}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
