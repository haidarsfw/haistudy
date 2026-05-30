"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, AlertTriangle, CalendarClock } from "lucide-react";
import { useScopedData } from "@/components/providers/scoped-data-provider";
import { useOptionalScope } from "@/components/providers/scope-provider";
import type { Schedule } from "@/types";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function pickNextExam(exams: Schedule[]): Schedule | null {
  const now = new Date();
  const upcoming = exams
    .filter((e) => e.examDate && new Date(e.examDate) > now)
    .sort((a, b) => new Date(a.examDate!).getTime() - new Date(b.examDate!).getTime());
  return upcoming[0] ?? null;
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
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [examSubject, setExamSubject] = useState<string | null>(null);
  const { examSchedule } = useScopedData();
  const scopeCtx = useOptionalScope();
  const periodLabel = scopeCtx?.scope.examPeriod === "uas" ? "UAS" : "UTS";

  const exam = useMemo(() => pickNextExam(examSchedule), [examSchedule]);

  useEffect(() => {
    if (!exam?.examDate) {
      setExamSubject(null);
      setTimeLeft(null);
      return;
    }
    setExamSubject(exam.subject);
    const update = () => setTimeLeft(calcTimeLeft(new Date(exam.examDate!)));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [exam]);

  const isUrgent = timeLeft && timeLeft.days <= 3;

  // No exam dates set yet
  if (!examSubject) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarClock className="h-4 w-4" />
          <span className="font-heading font-semibold">{periodLabel} Countdown</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Jadwal {periodLabel} belum diumumkan. Countdown akan muncul otomatis saat
          tanggal sudah diatur.
        </p>
      </div>
    );
  }

  // Exam passed
  if (!timeLeft) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="font-heading font-semibold">{periodLabel} Countdown</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Semua ujian sudah berlalu. Semoga hasilnya bagus!
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border p-4 fade-in-css ${
        isUrgent
          ? "border-destructive/30 bg-destructive/5 animate-pulse-glow"
          : "border-border bg-card"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 text-sm">
        {isUrgent ? (
          <AlertTriangle className="h-4 w-4 text-destructive" />
        ) : (
          <Clock className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="font-heading font-semibold">{periodLabel} Countdown</span>
      </div>

      <p className="mt-1 text-xs text-muted-foreground truncate">
        {examSubject}
      </p>

      {/* Prediction note */}
      {exam?.examNote?.includes("Prediksi") && (
        <p className="mt-0.5 text-[10px] text-amber-500/80">
          * Prediksi, bukan jadwal resmi
        </p>
      )}

      {/* Timer digits - scales with card width */}
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
