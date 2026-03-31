"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, AlertTriangle, CalendarClock } from "lucide-react";
import { getNextExam } from "@/data/schedules";
import { fadeIn } from "@/lib/motion";

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
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [examSubject, setExamSubject] = useState<string | null>(null);

  useEffect(() => {
    const exam = getNextExam();
    if (!exam?.examDate) return;

    setExamSubject(exam.subject);

    const update = () => {
      const tl = calcTimeLeft(new Date(exam.examDate!));
      setTimeLeft(tl);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const exam = getNextExam();
  const isUrgent = timeLeft && timeLeft.days <= 3;

  // No exam dates set yet
  if (!examSubject) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarClock className="h-4 w-4" />
          <span className="font-heading font-semibold">UTS Countdown</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Jadwal UTS belum diumumkan. Countdown akan muncul otomatis saat
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
          <span className="font-heading font-semibold">UTS Countdown</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Semua ujian sudah berlalu. Semoga hasilnya bagus!
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className={`rounded-xl border p-4 ${
        isUrgent
          ? "border-destructive/30 bg-destructive/5 animate-pulse-glow"
          : "border-border bg-card"
      }`}
      variants={fadeIn}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <div className="flex items-center gap-2 text-sm">
        {isUrgent ? (
          <AlertTriangle className="h-4 w-4 text-destructive" />
        ) : (
          <Clock className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="font-heading font-semibold">UTS Countdown</span>
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

      {/* Timer digits */}
      <div className="mt-3 flex items-baseline gap-1 justify-center">
        {timeLeft.days > 0 && (
          <>
            <TimeUnit value={timeLeft.days} label="hari" urgent={isUrgent} />
            <span className="text-lg font-light text-muted-foreground">:</span>
          </>
        )}
        <TimeUnit value={timeLeft.hours} label="jam" urgent={isUrgent} />
        <span className="text-lg font-light text-muted-foreground">:</span>
        <TimeUnit value={timeLeft.minutes} label="min" urgent={isUrgent} />
        <span className="text-lg font-light text-muted-foreground">:</span>
        <TimeUnit value={timeLeft.seconds} label="dtk" urgent={isUrgent} />
      </div>
    </motion.div>
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
      <div className="relative overflow-hidden h-7">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={value}
            initial={{ y: -28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 28, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className={`block font-mono text-xl font-bold tabular-nums ${
              urgent ? "text-destructive" : "text-foreground"
            }`}
          >
            {pad(value)}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}
