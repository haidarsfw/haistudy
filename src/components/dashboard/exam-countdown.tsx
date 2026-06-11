"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { useScopedData } from "@/components/providers/scoped-data-provider";
import { useOptionalScope } from "@/components/providers/scope-provider";
import {
  type ExamCategory,
  pickNextExam,
  hasUpcoming,
  loadCountdownCategory,
  saveCountdownCategory,
} from "@/lib/countdown";
import { ExamTypeSwitch } from "@/components/dashboard/exam-type-switch";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcTimeLeft(target: Date): TimeLeft | null {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function ExamCountdown() {
  const [category, setCategory] = useState<ExamCategory>("onsite");
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const { examSchedule } = useScopedData();
  const scopeCtx = useOptionalScope();
  const periodLabel = scopeCtx?.scope.examPeriod === "uas" ? "UAS" : "UTS";

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
      setTimeLeft(null);
      return;
    }
    const update = () => setTimeLeft(calcTimeLeft(new Date(exam.examDate!)));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [exam]);

  const handleChange = (c: ExamCategory) => {
    setCategory(c);
    saveCountdownCategory(c);
  };

  const isUrgent = !!timeLeft && timeLeft.days <= 3;
  const typeWord = category === "onsite" ? "onsite" : "tugas";
  const hasAnyDate = examSchedule.some((e) => e.examDate);
  const anyUpcoming = available.onsite || available.assignment;
  const typeText = exam
    ? exam.examType === "onsite"
      ? "Onsite Exam"
      : "Assignment"
    : null;

  return (
    <div
      className={`rounded-xl border p-4 fade-in-css ${
        isUrgent
          ? "border-destructive/30 bg-destructive/5 animate-pulse-glow"
          : "border-border bg-card"
      }`}
    >
      {/* Header: title + onsite/assignment switch */}
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          {isUrgent ? (
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
          ) : (
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="font-heading font-semibold truncate">
            {periodLabel} Countdown
          </span>
        </div>
        <ExamTypeSwitch
          value={category}
          onChange={handleChange}
          available={available}
        />
      </div>

      {exam && timeLeft ? (
        <>
          <p className="mt-2 text-xs text-muted-foreground truncate">
            {exam.subject}
          </p>
          {(typeText || exam.examFormat) && (
            <p className="mt-0.5 text-[10px] text-muted-foreground/80 truncate">
              {[typeText, exam.examFormat].filter(Boolean).join(" · ")}
            </p>
          )}

          {/* Timer digits — minutes + seconds always shown; days only when > 0 */}
          <div className="mt-4 py-4 md:py-6 flex items-baseline gap-1.5 md:gap-2 lg:gap-3 justify-center">
            {timeLeft.days > 0 && (
              <>
                <TimeUnit value={timeLeft.days} label="hari" urgent={isUrgent} />
                <span className="text-lg md:text-2xl lg:text-3xl font-light text-muted-foreground">:</span>
              </>
            )}
            <TimeUnit value={timeLeft.hours} label="jam" urgent={isUrgent} />
            <span className="text-lg md:text-2xl lg:text-3xl font-light text-muted-foreground">:</span>
            <TimeUnit value={timeLeft.minutes} label="min" urgent={isUrgent} />
            <span className="text-lg md:text-2xl lg:text-3xl font-light text-muted-foreground">:</span>
            <TimeUnit value={timeLeft.seconds} label="dtk" urgent={isUrgent} />
          </div>
        </>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          {!hasAnyDate
            ? `Jadwal ${periodLabel} belum diumumkan. Countdown akan muncul otomatis saat tanggal sudah diatur.`
            : !anyUpcoming
              ? "Semua ujian sudah berlalu. Semoga hasilnya bagus!"
              : `Tidak ada ujian ${typeWord} mendatang. Cek tipe lain lewat tombol di atas.`}
        </p>
      )}
    </div>
  );
}

function TimeUnit({
  value,
  label,
  urgent,
}: {
  value: number;
  label: string;
  urgent?: boolean | null;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative overflow-hidden h-9 md:h-11 lg:h-14">
        <span
          key={value}
          className={`block font-mono text-3xl md:text-4xl lg:text-5xl font-bold tabular-nums countdown-digit-anim ${
            urgent ? "text-destructive" : "text-foreground"
          }`}
        >
          {pad(value)}
        </span>
      </div>
      <span className="text-[9px] md:text-[10px] lg:text-xs text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}
