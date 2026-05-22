"use client";

import { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "@/components/providers/language-provider";
import { staggerItem } from "@/lib/motion";
import { getAllProgress, calcOverallProgress as calcOverall } from "@/lib/progress";
import { useScopedData } from "@/components/providers/scoped-data-provider";

function ProgressRing({ percent }: { percent: number }) {
  const r = 22;
  const stroke = 4;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percent / 100) * circumference;
  const size = (r + stroke) * 2;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={r + stroke}
          cy={r + stroke}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-border"
        />
        <circle
          cx={r + stroke}
          cy={r + stroke}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-primary transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <span className="absolute text-sm font-bold tabular-nums">{percent}%</span>
    </div>
  );
}

export function StudyProgressMini() {
  const { t } = useTranslation();
  const { subjects, content } = useScopedData();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const calc = () => calcOverall(getAllProgress(), subjects, content);
    setProgress(calc());
    const handleSync = () => setProgress(calc());
    window.addEventListener("hs-progress-synced", handleSync);
    window.addEventListener("hs-progress-updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("hs-progress-synced", handleSync);
      window.removeEventListener("hs-progress-updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [subjects, content]);

  return (
    <motion.div
      variants={staggerItem}
      className="rounded-xl border border-border bg-card p-4 transition-colors light-card-shadow flex flex-col"
    >
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          {t("dashboard.progress")}
        </span>
      </div>
      <div className="flex-1 flex items-center justify-center py-1">
        <ProgressRing percent={progress} />
      </div>
    </motion.div>
  );
}
