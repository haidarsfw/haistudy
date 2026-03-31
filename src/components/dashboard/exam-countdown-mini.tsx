"use client";

import { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { getNextExam } from "@/data/schedules";
import { useTranslation } from "@/components/providers/language-provider";
import { staggerItem } from "@/lib/motion";

export function ExamCountdownMini() {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState<string | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const exam = getNextExam();
    if (!exam?.examDate) return;
    setSubject(exam.subject);

    const update = () => {
      const diff = new Date(exam.examDate!).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown(null);
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      setIsUrgent(d <= 3);
      if (d > 0) {
        setCountdown(`${d} hari ${h} jam`);
      } else {
        const m = Math.floor((diff % 3600000) / 60000);
        setCountdown(`${h} jam ${m} menit`);
      }
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

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
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          {t("dashboard.exam_countdown")}
        </span>
      </div>

      {exam?.examDate && countdown ? (
        <>
          <p className="text-sm font-semibold truncate">{subject}</p>
          <p
            className={`mt-1 text-lg font-bold tabular-nums ${
              isUrgent ? "text-destructive" : "text-foreground"
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
    </motion.div>
  );
}
