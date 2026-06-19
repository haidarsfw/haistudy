"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PenLine, Clock, FileText, Award, AlertTriangle, Languages, ArrowLeft } from "lucide-react";
import type { ExamData } from "@/types/exam";
import { useTranslation } from "@/components/providers/language-provider";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { ExamConfirmModal } from "./exam-confirm-modal";

interface Props {
  exam: ExamData;
  examLanguage: "en" | "id";
  onLanguageChange: (lang: "en" | "id") => void;
  onStart: () => void;
  onBack: () => void;
  attemptNumber: number;
  maxAttempts: number;
}

/**
 * Pre-exam briefing screen with rules, info, and countdown start.
 */
export function ExamBriefing({
  exam,
  examLanguage,
  onLanguageChange,
  onStart,
  onBack,
  attemptNumber,
  maxAttempts,
}: Props) {
  const { t } = useTranslation();
  const [counting, setCounting] = useState(false);
  const [count, setCount] = useState(3);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const lang = examLanguage;

  const isUnlimited = maxAttempts === -1 || maxAttempts >= 999;
  const quotaMsg = isUnlimited
    ? t("exam.confirm_quota_unlimited")
    : t("exam.confirm_quota")
        .replace("{remaining}", String(maxAttempts - attemptNumber + 1))
        .replace("{max}", String(maxAttempts));
  const confirmMsg = `${quotaMsg}\n\n${t("exam.confirm_rules")}\n\n${t("exam.confirm_proceed")}`;

  const handleStart = () => {
    setShowConfirmModal(true);
  };

  const executeStart = () => {
    setShowConfirmModal(false);
    setCounting(true);
    let c = 3;
    setCount(c);
    const interval = setInterval(() => {
      c--;
      if (c <= 0) {
        clearInterval(interval);
        onStart();
      } else {
        setCount(c);
      }
    }, 800);
  };

  if (counting) {
    return (
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.span
          key={count}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="text-8xl font-black text-primary"
        >
          {count}
        </motion.span>
      </motion.div>
    );
  }

  const totalSubQuestions = exam.questions.reduce(
    (acc, q) => acc + (q.subQuestions?.length ?? (q.question ? 1 : 0)),
    0
  );

  const rules = [
    { icon: AlertTriangle, text: t("exam.briefing_no_ai") },
    { icon: PenLine, text: t("exam.briefing_fullscreen") },
    { icon: FileText, text: t("exam.briefing_theory") },
    { icon: Clock, text: t("exam.briefing_auto_submit") },
    { icon: Award, text: t("exam.briefing_free_nav") },
    { icon: Languages, text: t("exam.briefing_any_lang") },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] overflow-y-auto bg-background"
    >
      <div className="mx-auto max-w-lg px-5 py-8">
        <motion.div
          variants={staggerContainer(0.06)}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Back button */}
          <motion.div variants={staggerItem}>
            <button
              type="button"
              onClick={onBack}
              className="hs-press flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("exam.results_back")}
            </button>
          </motion.div>

          {/* Header */}
          <motion.div variants={staggerItem} className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
              <PenLine className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-black text-foreground">
              {t("exam.briefing_title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {exam.meta.courseName}
            </p>
          </motion.div>

          {/* Info grid */}
          <motion.div
            variants={staggerItem}
            className="grid grid-cols-2 gap-3"
          >
            <InfoCard icon={Clock} label={t("exam.duration")} value={`${exam.meta.durationMinutes} min`} />
            <InfoCard icon={FileText} label={t("exam.total_questions")} value={`${totalSubQuestions}`} />
            <InfoCard icon={Award} label={t("exam.total_points")} value={`${exam.meta.totalScore}`} />
            <InfoCard icon={PenLine} label={t("exam.format")} value={exam.meta.formatDescription[lang]} />
          </motion.div>

          {/* Rules */}
          <motion.div variants={staggerItem}>
            <h3 className="mb-3 text-sm font-bold text-foreground">
              {t("exam.briefing_rules")}
            </h3>
            <div className="space-y-2">
              {rules.map((rule, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 rounded-lg border border-border bg-card/50 px-3 py-2"
                >
                  <rule.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm text-foreground/90">{rule.text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Language selector */}
          <motion.div variants={staggerItem}>
            <p className="mb-2 text-sm font-semibold text-foreground">
              {t("exam.briefing_lang_select")}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onLanguageChange("en")}
                className={`hs-press flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                  examLanguage === "en"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                🇬🇧 English
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange("id")}
                className={`hs-press flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                  examLanguage === "id"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                🇮🇩 Indonesia
              </button>
            </div>
          </motion.div>

          {/* Attempt info */}
          <motion.div
            variants={staggerItem}
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30"
          >
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              {t("exam.briefing_attempt")
                .replace("{n}", String(attemptNumber))
                .replace("{max}", String(maxAttempts))}
            </p>
          </motion.div>

          {/* Start button */}
          <motion.div variants={staggerItem}>
            <button
              type="button"
              onClick={handleStart}
              className="hs-press w-full rounded-xl bg-primary py-3.5 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
            >
              {t("exam.briefing_cta")}
            </button>
          </motion.div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showConfirmModal && (
          <ExamConfirmModal
            open={true}
            title={t("exam.briefing_title")}
            message={confirmMsg}
            confirmText={t("exam.briefing_cta")}
            cancelText={t("exam.submit_back")}
            onConfirm={executeStart}
            onCancel={() => setShowConfirmModal(false)}
          />
        )}
      </AnimatePresence>
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
