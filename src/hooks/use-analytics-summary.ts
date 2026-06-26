"use client";

import { useState, useEffect, useMemo } from "react";

/** One practice-exam attempt, summary columns only (mirrors the API route). */
export interface AnalyticsAttempt {
  id: string;
  subject_id: string;
  total_score: number | null;
  max_score: number | null;
  score_pct: number | null;
  status: string;
  started_at: string | null;
  submitted_at: string | null;
  duration_used_seconds: number | null;
  auto_submitted: boolean | null;
  exam_language: string | null;
  created_at: string;
}

interface SummaryResponse {
  attempts: AnalyticsAttempt[];
  totalOnlineMinutes: number;
  memberSince: string | null;
}

/** Per-subject best/attempt rollup, keyed by subject_id. */
export interface SubjectExamStat {
  attempts: number;
  bestPct: number | null;
  bestScore: number | null;
  bestMax: number | null;
}

/** Global aggregates derived from the caller's attempts. */
export interface ExamStats {
  totalAttempts: number;
  gradedAttempts: number;
  bestPct: number | null;
  avgPct: number | null;
  totalExamSeconds: number;
  lastAttemptAt: string | null;
  perSubject: Record<string, SubjectExamStat>;
}

function computeStats(attempts: AnalyticsAttempt[]): ExamStats {
  const graded = attempts.filter(
    (a) => a.status === "graded" && a.score_pct != null
  );

  let bestPct: number | null = null;
  let pctSum = 0;
  for (const a of graded) {
    const pct = a.score_pct as number;
    pctSum += pct;
    if (bestPct == null || pct > bestPct) bestPct = pct;
  }

  let totalExamSeconds = 0;
  for (const a of attempts) totalExamSeconds += a.duration_used_seconds ?? 0;

  const perSubject: Record<string, SubjectExamStat> = {};
  for (const a of attempts) {
    const s = (perSubject[a.subject_id] ??= {
      attempts: 0,
      bestPct: null,
      bestScore: null,
      bestMax: null,
    });
    s.attempts += 1;
    if (a.status === "graded" && a.score_pct != null) {
      if (s.bestPct == null || a.score_pct > s.bestPct) {
        s.bestPct = a.score_pct;
        s.bestScore = a.total_score;
        s.bestMax = a.max_score;
      }
    }
  }

  // attempts arrive ordered created_at desc, so [0] is the latest.
  const lastAttemptAt = attempts[0]?.created_at ?? null;

  return {
    totalAttempts: attempts.length,
    gradedAttempts: graded.length,
    bestPct,
    avgPct: graded.length ? Math.round(pctSum / graded.length) : null,
    totalExamSeconds,
    lastAttemptAt,
    perSubject,
  };
}

/**
 * Fetches the caller's analytics summary ONCE on mount (re-fetches only when
 * the license/scope changes). No polling — this is the analytics page's single
 * network call, by design (free-tier safe).
 */
export function useAnalyticsSummary(licenseKey: string, scopeKey: string) {
  const [attempts, setAttempts] = useState<AnalyticsAttempt[]>([]);
  const [totalOnlineMinutes, setTotalOnlineMinutes] = useState(0);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!licenseKey || !scopeKey) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/analytics/summary")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load analytics");
        }
        return (await res.json()) as SummaryResponse;
      })
      .then((data) => {
        if (cancelled) return;
        setAttempts(data.attempts ?? []);
        setTotalOnlineMinutes(data.totalOnlineMinutes ?? 0);
        setMemberSince(data.memberSince ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [licenseKey, scopeKey]);

  const stats = useMemo(() => computeStats(attempts), [attempts]);

  return { attempts, stats, totalOnlineMinutes, memberSince, loading, error };
}
