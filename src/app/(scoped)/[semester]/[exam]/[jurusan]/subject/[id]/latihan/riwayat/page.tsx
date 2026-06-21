"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useScope } from "@/components/providers/scope-provider";
import { useScopedData } from "@/components/providers/scoped-data-provider";
import { ExamResults } from "@/components/exam/exam-results";
import { ExamGradingLoader } from "@/components/exam/exam-grading-loader";
import { useExam } from "@/hooks/use-exam";
import { useTranslation } from "@/components/providers/language-provider";
import { AlertTriangle } from "lucide-react";
import type { ExamGradingResult } from "@/types/exam";

type Phase = "loading" | "results" | "regrading" | "regrade-error";

/**
 * View past exam attempt: /[scope]/subject/[id]/latihan/riwayat?attemptId=xxx
 *
 * Loads full attempt data from the API and displays the ExamResults view.
 * Supports re-grading: clicking "Nilai Ulang" shows the same grading
 * loading screen used during exam submission, then refreshes scores.
 */
export default function RiwayatPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { scopePath } = useScope();
  const { t } = useTranslation();
  const subjectId = params.id as string;
  const attemptId = searchParams.get("attemptId");

  const { examData, examDataLoaded } = useScopedData();
  const { fetchAttemptDetail, regradeAttempt } = useExam(subjectId);

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [regradeError, setRegradeError] = useState<string | null>(null);
  const [attemptData, setAttemptData] = useState<{
    gradingResults: ExamGradingResult[];
    totalScore: number;
    maxScore: number;
    scorePct: number;
    durationUsedSeconds: number | null;
    autoSubmitted: boolean;
    userAnswers: Record<string, string>;
    examLanguage: "en" | "id";
  } | null>(null);

  const handleClose = useCallback(() => {
    router.push(`/${scopePath}/subject/${subjectId}?tab=10`);
  }, [router, scopePath, subjectId]);

  const handleRetry = useCallback(() => {
    router.push(`/${scopePath}/subject/${subjectId}/latihan`);
  }, [router, scopePath, subjectId]);

  // ─── Regrade handler ───
  const handleRegrade = useCallback(async () => {
    if (!attemptId) return;
    setPhase("regrading");
    setRegradeError(null);

    try {
      const result = await regradeAttempt(attemptId);

      // Update local state with new grading results
      setAttemptData((prev) =>
        prev
          ? {
              ...prev,
              gradingResults: result.gradingResults,
              totalScore: result.totalScore,
              maxScore: result.maxScore,
              scorePct: result.scorePct,
              durationUsedSeconds: result.durationUsedSeconds,
              autoSubmitted: result.autoSubmitted,
            }
          : prev
      );
      setPhase("results");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[Regrade] Failed:", msg, err);
      setRegradeError(msg);
      setPhase("regrade-error");
    }
  }, [attemptId, regradeAttempt]);

  // ─── Retry regrade after error ───
  const retryRegrade = useCallback(() => {
    handleRegrade();
  }, [handleRegrade]);

  // ─── Back to results from error ───
  const backToResults = useCallback(() => {
    setPhase("results");
    setRegradeError(null);
  }, []);

  // ─── Initial data load ───
  useEffect(() => {
    if (!attemptId || !examDataLoaded) return;

    (async () => {
      try {
        setPhase("loading");
        const attempt = await fetchAttemptDetail(attemptId);

        if (!attempt) {
          setError("Riwayat tidak ditemukan");
          return;
        }

        // Parse answers into a Record<questionId, answer>
        const answersArray = Array.isArray(attempt.answers)
          ? attempt.answers
          : [];
        const userAnswers: Record<string, string> = {};
        for (const a of answersArray) {
          if (a.questionId && typeof a.answer === "string") {
            userAnswers[a.questionId] = a.answer;
          }
        }

        // Parse grading results
        const gradingResults: ExamGradingResult[] = Array.isArray(
          attempt.grading_results
        )
          ? attempt.grading_results
          : [];

        setAttemptData({
          gradingResults,
          totalScore: attempt.total_score ?? 0,
          maxScore: attempt.max_score ?? 0,
          scorePct: attempt.score_pct ?? 0,
          durationUsedSeconds: attempt.duration_used_seconds,
          autoSubmitted: attempt.auto_submitted ?? false,
          userAnswers,
          examLanguage: (attempt.exam_language as "en" | "id") ?? "id",
        });
        setPhase("results");
      } catch (err) {
        console.error("Failed to load attempt:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    })();
  }, [attemptId, examDataLoaded, fetchAttemptDetail]);

  // ─── No attemptId ───
  if (!attemptId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">
          ID riwayat tidak ditemukan.
        </p>
        <button
          onClick={handleClose}
          className="text-sm text-primary hover:underline"
        >
          Kembali
        </button>
      </div>
    );
  }

  // ─── Loading initial data ───
  if (phase === "loading" || !examDataLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // ─── Initial load error ───
  if (error || !attemptData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-500">{error || "Data tidak tersedia"}</p>
        <button
          onClick={handleClose}
          className="text-sm text-primary hover:underline"
        >
          Kembali
        </button>
      </div>
    );
  }

  const exam = examData[subjectId];
  if (!exam) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">
          Data ujian tidak ditemukan.
        </p>
        <button
          onClick={handleClose}
          className="text-sm text-primary hover:underline"
        >
          Kembali
        </button>
      </div>
    );
  }

  // ─── Re-grading: show the same loading screen as exam submission ───
  if (phase === "regrading") {
    return <ExamGradingLoader />;
  }

  // ─── Re-grade error: show error with retry + back buttons ───
  if (phase === "regrade-error") {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-xl">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <h3 className="text-base font-bold text-foreground">
            {t("exam.regrade_error_title")}
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {t("exam.regrade_error_desc")}
          </p>

          {/* Error detail box */}
          {regradeError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-left dark:border-red-900 dark:bg-red-950/30">
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-500">
                Error Log
              </p>
              <p className="mt-1 break-all font-mono text-xs text-red-700 dark:text-red-400">
                {regradeError}
              </p>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={backToResults}
              className="hs-press flex-1 rounded-xl border border-border bg-card py-3 text-sm font-semibold text-foreground"
            >
              {t("exam.results_back")}
            </button>
            <button
              type="button"
              onClick={retryRegrade}
              className="hs-press flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"
            >
              {t("exam.submit_retry")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Results view ───
  return (
    <ExamResults
      exam={exam}
      gradingResults={attemptData.gradingResults}
      totalScore={attemptData.totalScore}
      maxScore={attemptData.maxScore}
      scorePct={attemptData.scorePct}
      durationUsedSeconds={attemptData.durationUsedSeconds}
      autoSubmitted={attemptData.autoSubmitted}
      userAnswers={attemptData.userAnswers}
      examLanguage={attemptData.examLanguage}
      onClose={handleClose}
      onRetry={handleRetry}
      onRegrade={handleRegrade}
    />
  );
}
