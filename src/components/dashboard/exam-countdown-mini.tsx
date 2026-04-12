"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Clock, AlertTriangle, Timer } from "lucide-react";
import { motion } from "framer-motion";
import { getNextExam } from "@/data/schedules";
import { useTranslation } from "@/components/providers/language-provider";
import { staggerItem } from "@/lib/motion";

type CountdownMode = "simple" | "detailed";

export function ExamCountdownMini() {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState<string | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);
  const [mode, setMode] = useState<CountdownMode>("simple");
  const rafRef = useRef<number | null>(null);

  // Memoized update function for both modes
  const update = useCallback((examDate: string, currentMode: CountdownMode) => {
    const diff = new Date(examDate).getTime() - Date.now();
    if (diff <= 0) {
      setCountdown(null);
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    setIsUrgent(d <= 3);

    if (currentMode === "detailed") {
      const s = Math.floor((diff % 3600000) / 1000) % 60;
      const ms = Math.floor(diff % 1000);
      if (d > 0) {
        setCountdown(`${d}d ${h}h ${String(s).padStart(2, "0")}s ${String(ms).padStart(3, "0")}ms`);
      } else {
        const m = Math.floor((diff % 3600000) / 60000);
        setCountdown(`${h}h ${m}m ${String(s).padStart(2, "0")}s ${String(ms).padStart(3, "0")}ms`);
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

  useEffect(() => {
    const exam = getNextExam();
    if (!exam?.examDate) return;
    setSubject(exam.subject);

    if (mode === "detailed") {
      // Use requestAnimationFrame loop for millisecond precision
      const tick = () => {
        update(exam.examDate!, mode);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
      return () => {
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      };
    } else {
      // Simple mode: update every minute
      update(exam.examDate!, mode);
      const interval = setInterval(() => update(exam.examDate!, mode), 60000);
      return () => clearInterval(interval);
    }
  }, [mode, update]);

  const exam = getNextExam();

  return (
    <motion.div
      variants={staggerItem}
      className={`rounded-xl border bg-card p-4 transition-colors light-card-shadow ${
        isUrgent ? "border-destructive/30" : "border-border"
      }`}
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
        {/* Toggle button */}
        {exam?.examDate && countdown && (
          <button
            onClick={() => setMode((prev) => (prev === "simple" ? "detailed" : "simple"))}
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              mode === "detailed"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            title={mode === "simple" ? "Mode detail (dengan detik & milidetik)" : "Mode simpel (hari & jam)"}
          >
            <Timer className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {exam?.examDate && countdown ? (
        <>
          <p className="text-sm font-semibold truncate">{subject}</p>
          <p
            className={`mt-1 font-bold tabular-nums ${
              mode === "detailed" ? "text-sm" : "text-lg"
            } ${isUrgent ? "text-destructive" : "text-foreground"}`}
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
    </motion.div>
  );
}
