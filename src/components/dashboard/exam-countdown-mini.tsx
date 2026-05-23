"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Clock, AlertTriangle, Timer } from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";
import { useSettings } from "@/hooks/use-settings";
import { useScopedData } from "@/components/providers/scoped-data-provider";
import { whenIdle } from "@/lib/defer";
import type { Schedule } from "@/types";

function pickNextExam(exams: Schedule[]): Schedule | null {
  const now = new Date();
  const upcoming = exams
    .filter((e) => e.examDate && new Date(e.examDate) > now)
    .sort((a, b) => new Date(a.examDate!).getTime() - new Date(b.examDate!).getTime());
  return upcoming[0] ?? null;
}

export function ExamCountdownMini() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettings();
  const [countdown, setCountdown] = useState<string | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);

  // Derive mode from synced settings (default: detailed = true)
  const isDetailed = settings.countdownDetailed ?? true;

  const toggleMode = useCallback(() => {
    updateSettings({ countdownDetailed: !isDetailed });
  }, [isDetailed, updateSettings]);

  // Memoized update function for both modes
  const update = useCallback((examDate: string, detailed: boolean) => {
    const diff = new Date(examDate).getTime() - Date.now();
    if (diff <= 0) {
      setCountdown(null);
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    setIsUrgent(d <= 3);

    if (detailed) {
      const m = Math.floor((diff % 3600000) / 60000);
      if (d > 0) {
        setCountdown(`${d} hari ${h} jam ${m} menit`);
      } else {
        setCountdown(`${h} jam ${m} menit`);
      }
    } else {
      if (d > 0) {
        setCountdown(`${d} hari ${h} jam`);
      } else {
        const m = Math.floor((diff % 3600000) / 60000);
        setCountdown(`${h} jam ${m} menit`);
      }
    }
  }, []);

  const { examSchedule } = useScopedData();
  const exam = useMemo(() => pickNextExam(examSchedule), [examSchedule]);

  useEffect(() => {
    if (!exam?.examDate) {
      setSubject(null);
      setCountdown(null);
      return;
    }
    setSubject(exam.subject);

    // First value renders synchronously so the card has correct content
    // on first paint. The per-minute interval is deferred to idle so it
    // doesn't compete with hydration / LCP.
    update(exam.examDate!, isDetailed);
    let interval: ReturnType<typeof setInterval> | null = null;
    const cancelIdle = whenIdle(() => {
      interval = setInterval(() => update(exam.examDate!, isDetailed), 60000);
    });
    return () => {
      cancelIdle();
      if (interval) clearInterval(interval);
    };
  }, [isDetailed, update, exam]);

  return (
    <div
      className={`rounded-xl border bg-card p-4 transition-colors light-card-shadow ${
        isUrgent ? "border-destructive/30" : "border-border"
      } flex flex-col`}
    >
      <div className="flex items-center gap-2 mb-2">
        {isUrgent ? (
          <AlertTriangle className="h-4 w-4 text-destructive" />
        ) : (
          <Clock className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex-1">
          {t("dashboard.exam_countdown")}
        </span>
        {/* Toggle button — synced to Supabase */}
        {exam?.examDate && countdown && (
          <button
            onClick={toggleMode}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              isDetailed
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            aria-label={isDetailed ? "Beralih ke mode simpel" : "Beralih ke mode detail"}
            aria-pressed={isDetailed}
            title={isDetailed ? "Mode simpel (hari & jam)" : "Mode detail (hari, jam, menit, detik)"}
          >
            <Timer className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {exam?.examDate && countdown ? (
          <>
            <p className="text-sm font-semibold truncate">{subject}</p>
            <p
              className={`mt-1 text-base font-bold tabular-nums leading-snug ${
                isUrgent ? "text-destructive animate-urgent-pulse" : "text-foreground"
              }`}
            >
              {countdown}
            </p>
            {exam.examNote?.includes("Prediksi") && (
              <p className="mt-1 text-[10px] text-amber-500/80">
                * Prediksi, bukan jadwal resmi
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            {exam ? t("dashboard.exam_not_announced") : t("dashboard.all_exams_passed")}
          </p>
        )}
      </div>
    </div>
  );
}
