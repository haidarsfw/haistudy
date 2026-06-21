"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  ExamQuota,
  ExamGradingResult,
  UserExamAnswer,
} from "@/types/exam";

interface AttemptSummary {
  id: string;
  total_score: number | null;
  max_score: number;
  score_pct: number | null;
  started_at: string;
  submitted_at: string | null;
  duration_used_seconds: number | null;
  auto_submitted: boolean;
  status: string;
  exam_language: string;
}

interface StartResult {
  attemptId: string;
  startedAt: string;
  quota: ExamQuota;
}

interface SubmitResult {
  attemptId: string;
  gradingResults: ExamGradingResult[];
  totalScore: number;
  maxScore: number;
  scorePct: number;
  durationUsedSeconds: number | null;
  autoSubmitted: boolean;
}

interface RegradeResult {
  attemptId: string;
  gradingResults: ExamGradingResult[];
  totalScore: number;
  maxScore: number;
  scorePct: number;
  durationUsedSeconds: number | null;
  autoSubmitted: boolean;
}

/**
 * Hook for managing exam lifecycle: quota, start, abandon, submit, history.
 */
export function useExam(subjectId: string) {
  const [quota, setQuota] = useState<ExamQuota | null>(null);
  const [history, setHistory] = useState<AttemptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuota = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/exam/quota?subjectId=${encodeURIComponent(subjectId)}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch quota");
      }
      const data = await res.json();
      setQuota(data.quota);
      setHistory(data.history ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    fetchQuota();
  }, [fetchQuota]);

  const startExam = useCallback(
    async (
      examId: string,
      examLanguage: "en" | "id"
    ): Promise<StartResult> => {
      const res = await fetch("/api/exam/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, examId, examLanguage }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start exam");
      }
      // Refresh quota after starting
      setQuota(data.quota);
      return data as StartResult;
    },
    [subjectId]
  );

  const abandonExam = useCallback(
    async (attemptId: string): Promise<{ ok: boolean }> => {
      const res = await fetch("/api/exam/abandon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to abandon");
      }
      // Refresh quota after abandoning
      await fetchQuota();
      return data;
    },
    [fetchQuota]
  );

  const submitExam = useCallback(
    async (
      attemptId: string,
      answers: UserExamAnswer[],
      autoSubmitted = false
    ): Promise<SubmitResult> => {
      const res = await fetch("/api/exam/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          subjectId,
          answers,
          autoSubmitted,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit");
      }
      return data as SubmitResult;
    },
    [subjectId]
  );

  const fetchAttemptDetail = useCallback(
    async (attemptId: string) => {
      const res = await fetch(
        `/api/exam/history?subjectId=${encodeURIComponent(subjectId)}&attemptId=${encodeURIComponent(attemptId)}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch attempt");
      }
      return data.attempt;
    },
    [subjectId]
  );

  const deleteAttempt = useCallback(
    async (attemptId: string): Promise<{ ok: boolean }> => {
      const res = await fetch("/api/exam/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete");
      }
      // Refresh quota + history after deleting
      await fetchQuota();
      return data;
    },
    [fetchQuota]
  );

  const regradeAttempt = useCallback(
    async (attemptId: string): Promise<RegradeResult> => {
      const res = await fetch("/api/exam/regrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, subjectId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to regrade");
      return data as RegradeResult;
    },
    [subjectId]
  );

  return {
    quota,
    history,
    loading,
    error,
    startExam,
    abandonExam,
    submitExam,
    fetchAttemptDetail,
    deleteAttempt,
    regradeAttempt,
    refreshQuota: fetchQuota,
  };
}
