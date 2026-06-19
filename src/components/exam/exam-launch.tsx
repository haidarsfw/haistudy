"use client";

import { motion } from "framer-motion";
import { PenLine, Clock, FileText, Award, History, ChevronRight, Lock, AlertCircle, Trash2 } from "lucide-react";
import type { ExamData } from "@/types/exam";
import { useExam } from "@/hooks/use-exam";
import { useTranslation } from "@/components/providers/language-provider";
import { staggerContainer, staggerItem } from "@/lib/motion";

interface Props {
  exam: ExamData;
  subjectId: string;
  onStartExam: () => void;
  onViewAttempt?: (attemptId: string) => void;
  onDeleteAttempt?: (attemptId: string) => void;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

/**
 * Launch screen shown inside the "Latihan Soal" tab.
 * Displays exam info, quota, history, and CTA to start.
 */
export function ExamLaunch({ exam, subjectId, onStartExam, onViewAttempt, onDeleteAttempt }: Props) {
  const { t } = useTranslation();
  const { quota, history, loading } = useExam(subjectId);
  const lang = "id"; // Launch screen always uses app language

  const totalQuestions = exam.questions.length;

  const isUnlimited = quota ? quota.max === -1 : false;
  const hasQuota = quota ? (isUnlimited || quota.remaining > 0) : true;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer(0.06)}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* Hero card */}
      <motion.div
        variants={staggerItem}
        className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-primary/[0.02] p-5"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <PenLine className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <span className="inline-block rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              {t("exam.badge")}
            </span>
            <h2 className="mt-1.5 text-lg font-black text-foreground">
              {exam.meta.title[lang]}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("exam.launch_desc")}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Info grid */}
      <motion.div
        variants={staggerItem}
        className="grid grid-cols-2 gap-3"
      >
        <InfoCard icon={Clock} label={t("exam.duration")} value={`${exam.meta.durationMinutes} menit`} />
        <InfoCard icon={FileText} label={t("exam.total_questions")} value={`${totalQuestions} soal`} />
        <InfoCard icon={Award} label={t("exam.total_points")} value={`${exam.meta.totalScore} poin`} />
        <InfoCard icon={PenLine} label={t("exam.format")} value={exam.meta.formatDescription[lang]} />
      </motion.div>

      {/* Quota card */}
      {quota && (
        <motion.div
          variants={staggerItem}
          className="rounded-2xl border border-border bg-card p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">
                {t("exam.quota_title")}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isUnlimited
                  ? t("exam.quota_unlimited")
                  : t("exam.quota_tier_hint")
                      .replace("{tier}", "")
                      .replace("{max}", String(quota.max))}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {isUnlimited ? (
                <span className="text-2xl font-bold text-primary">∞</span>
              ) : (
                Array.from({ length: quota.max }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-3 w-3 rounded-full transition-colors ${
                      i < quota.used
                        ? "bg-muted-foreground/40"
                        : "bg-primary"
                    }`}
                  />
                ))
              )}
            </div>
          </div>
          <p className="mt-2 text-center text-2xl font-black tabular-nums text-foreground">
            {isUnlimited ? "∞" : quota.remaining}
            <span className="text-sm text-muted-foreground">
              /{isUnlimited ? "∞" : quota.max}
            </span>
          </p>
        </motion.div>
      )}

      {/* Warnings */}
      <motion.div
        variants={staggerItem}
        className="space-y-2"
      >
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {t("exam.warning_ai_off")}
          </p>
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            {t("exam.warning_fullscreen")}
          </p>
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div variants={staggerItem}>
        {hasQuota ? (
          <button
            type="button"
            onClick={onStartExam}
            className="hs-press w-full rounded-xl bg-primary py-3.5 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
          >
            {t("exam.cta_start")}
          </button>
        ) : (
          <div className="rounded-xl border border-border bg-muted/30 py-3.5 text-center">
            <p className="text-sm font-bold text-muted-foreground">
              {t("exam.cta_no_quota")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("exam.quota_upgrade")}
            </p>
          </div>
        )}
      </motion.div>

      {/* History */}
      {history.length > 0 && (
        <motion.div variants={staggerItem}>
          <div className="flex items-center gap-2 mb-3">
            <History className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-bold text-foreground">
              {t("exam.history_title")}
            </h3>
          </div>
          <div className="space-y-2">
            {history.map((attempt) => (
              <div
                key={attempt.id}
                role="button"
                tabIndex={0}
                onClick={() => onViewAttempt?.(attempt.id)}
                onKeyDown={(e) => { if (e.key === "Enter") onViewAttempt?.(attempt.id); }}
                className="hs-press flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-3 text-left"
              >
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold tabular-nums text-foreground">
                      {attempt.total_score ?? "–"}
                      <span className="text-xs text-muted-foreground">
                        /{attempt.max_score}
                      </span>
                    </span>
                    {attempt.score_pct != null && (
                      <span className="text-xs font-semibold text-muted-foreground">
                        ({attempt.score_pct}%)
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{formatDate(attempt.started_at)}</span>
                    {attempt.duration_used_seconds != null && (
                      <span>
                        · {formatDuration(attempt.duration_used_seconds)}
                      </span>
                    )}
                    {attempt.auto_submitted && (
                      <span className="text-amber-500">· auto</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(t("exam.delete_confirm"))) {
                      onDeleteAttempt?.(attempt.id);
                    }
                  }}
                  className="hs-press flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground/50 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Banner */}
      <motion.div variants={staggerItem}>
        <p className="text-center text-[10px] text-muted-foreground/60">
          {exam.meta.banner[lang]}
        </p>
      </motion.div>
    </motion.div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-3">
      <Icon className="mb-1.5 h-4 w-4 text-muted-foreground" />
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}
