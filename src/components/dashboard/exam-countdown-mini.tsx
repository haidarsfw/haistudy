"use client";

import { useState, useEffect, useMemo } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";
import { useScopedData } from "@/components/providers/scoped-data-provider";
import {
  type ExamCategory,
  pickNextExam,
  hasUpcoming,
  loadCountdownCategory,
  saveCountdownCategory,
} from "@/lib/countdown";
import { ExamTypeSwitch } from "@/components/dashboard/exam-type-switch";

// Minutes are always included (no hide toggle); days drop out once at zero.
function formatCountdown(examDate: string): { text: string | null; urgent: boolean } {
  const diff = new Date(examDate).getTime() - Date.now();
  if (diff <= 0) return { text: null, urgent: false };
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const text = d > 0 ? `${d} hari ${h} jam ${m} menit` : `${h} jam ${m} menit`;
  return { text, urgent: d <= 3 };
}

export function ExamCountdownMini() {
  const { t } = useTranslation();
  const [category, setCategory] = useState<ExamCategory>("onsite");
  const [countdown, setCountdown] = useState<string | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);
  const { examSchedule } = useScopedData();

  // Restore the persisted category once mounted (client-only).
  useEffect(() => {
    setCategory(loadCountdownCategory());
  }, []);

  const exam = useMemo(
    () => pickNextExam(examSchedule, category),
    [examSchedule, category]
  );
  const available = useMemo(
    () => ({
      onsite: hasUpcoming(examSchedule, "onsite"),
      assignment: hasUpcoming(examSchedule, "assignment"),
    }),
    [examSchedule]
  );

  useEffect(() => {
    if (!exam?.examDate) {
      setCountdown(null);
      return;
    }
    const tick = () => {
      const { text, urgent } = formatCountdown(exam.examDate!);
      setCountdown(text);
      setIsUrgent(urgent);
    };
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, [exam]);

  const handleChange = (c: ExamCategory) => {
    setCategory(c);
    saveCountdownCategory(c);
  };

  const typeWord = category === "onsite" ? "onsite" : "tugas";
  const hasAnyDate = examSchedule.some((e) => e.examDate);
  const anyUpcoming = available.onsite || available.assignment;

  return (
    <div
      className={`rounded-xl border bg-card p-4 transition-colors light-card-shadow ${
        isUrgent ? "border-destructive/30" : "border-border"
      } flex flex-col`}
    >
      <div className="flex items-center gap-2 mb-2">
        {isUrgent ? (
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
        ) : (
          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex-1 truncate">
          {t("dashboard.exam_countdown")}
        </span>
        <ExamTypeSwitch
          value={category}
          onChange={handleChange}
          available={available}
        />
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {exam?.examDate && countdown ? (
          <>
            <p className="text-sm font-semibold truncate">{exam.subject}</p>
            <p
              className={`mt-1 text-base font-bold tabular-nums leading-snug ${
                isUrgent ? "text-destructive animate-urgent-pulse" : "text-foreground"
              }`}
            >
              {countdown}
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            {!hasAnyDate
              ? t("dashboard.exam_not_announced")
              : !anyUpcoming
                ? t("dashboard.all_exams_passed")
                : `Tidak ada ${typeWord} mendatang.`}
          </p>
        )}
      </div>
    </div>
  );
}
