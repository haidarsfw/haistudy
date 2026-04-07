"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { examSchedule } from "@/data/schedules";
import { ExamCountdown } from "@/components/dashboard/exam-countdown";
import { useTranslation } from "@/components/providers/language-provider";
import { SubjectIcon } from "@/components/shared/subject-icon";
import { getSubjectById } from "@/data/subjects";
import { staggerContainer, staggerItem } from "@/lib/motion";

const subjectColors: Record<string, string> = {
  statistik: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  biseko: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  cbkwn: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  akuntansi: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  foundai: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export default function JadwalUTSPage() {
  const { t, locale } = useTranslation();

  return (
    <motion.div
      className="mx-auto max-w-5xl px-4 py-6 space-y-8"
      variants={staggerContainer(0.08)}
      initial="hidden"
      animate="visible"
    >
      {/* Page header */}
      <motion.div variants={staggerItem}>
        <h1 className="font-heading text-xl font-bold flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          {t("schedule.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("schedule.subtitle")}
        </p>
      </motion.div>

      {/* Countdown */}
      <motion.div variants={staggerItem}>
        <ExamCountdown />
      </motion.div>

      {/* Exam Schedule Cards */}
      <motion.section variants={staggerItem} className="space-y-4">
        <h2 className="font-heading text-base font-semibold flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          {t("schedule.exam_title")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {examSchedule.map((exam) => {
            const subject = getSubjectById(exam.subjectId);
            const colorClass =
              subjectColors[exam.subjectId] || "bg-primary/10 text-primary";
            const hasDate = !!exam.examDate;

            return (
              <div
                key={exam.subjectId}
                className="rounded-xl border border-border bg-card p-4 space-y-3"
              >
                <Link href={`/subject/${exam.subjectId}`} className="flex items-start gap-3 group">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${colorClass}`}
                  >
                    {subject ? (
                      <SubjectIcon
                        icon={subject.icon}
                        className="h-5 w-5"
                      />
                    ) : (
                      <BookOpen className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                      {exam.subject}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {exam.examType === "onsite" ? "Onsite" : "Online"}
                      </span>
                      {exam.examNote && (
                        <span className="text-[10px] text-muted-foreground">
                          {exam.examNote}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                  {hasDate ? (
                    <span>
                      {new Date(exam.examDate!).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      {" · "}
                      {exam.examType === "online"
                        ? `Deadline ${exam.startTime} WIB`
                        : `${exam.startTime} – ${exam.endTime} WIB`}
                    </span>
                  ) : (
                    <span className="italic">{t("schedule.not_announced")}</span>
                  )}
                </div>

                {exam.examType === "online" && (
                  <a
                    href="https://exam.apps.binus.ac.id"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    exam.apps.binus.ac.id
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </motion.section>

      {/* Note */}
      <motion.div variants={staggerItem}>
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              {t("schedule.note")}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
