"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useScope } from "@/components/providers/scope-provider";
import { useScopedData } from "@/components/providers/scoped-data-provider";
import { ExamResults } from "@/components/exam/exam-results";
import { useExam } from "@/hooks/use-exam";
import type { ExamGradingResult } from "@/types/exam";

/**
 * View past exam attempt: /[scope]/subject/[id]/latihan/riwayat?attemptId=xxx
 *
 * Loads full attempt data from the API and displays the ExamResults view.
 */
export default function RiwayatPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { scopePath } = useScope();
  const subjectId = params.id as string;
  const attemptId = searchParams.get("attemptId");

  const { examData, examDataLoaded } = useScopedData();
  const { fetchAttemptDetail } = useExam(subjectId);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!attemptId || !examDataLoaded) return;

    (async () => {
      try {
        setLoading(true);
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
      } catch (err) {
        console.error("Failed to load attempt:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
  }, [attemptId, examDataLoaded, fetchAttemptDetail]);

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

  if (loading || !examDataLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

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

  const handleRetry = useCallback(() => {
    router.push(`/${scopePath}/subject/${subjectId}/latihan`);
  }, [router, scopePath, subjectId]);

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
    />
  );
}
