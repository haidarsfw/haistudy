"use client";

import { Fragment, useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  BookOpen,
  ExternalLink,
  ClipboardList,
} from "lucide-react";
import type { Schedule, Subject } from "@/types";
import { ExamCountdown } from "@/components/dashboard/exam-countdown";
import { useTranslation } from "@/components/providers/language-provider";
import { SubjectIcon } from "@/components/shared/subject-icon";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { useScope } from "@/components/providers/scope-provider";
import { loadCourses, loadSchedule } from "@/data";
import { examCategory } from "@/lib/countdown";

export default function JadwalPage() {
  const { t, locale } = useTranslation();
  const { scope, scopePath } = useScope();
  const [examSchedule, setExamSchedule] = useState<Schedule[]>([]);
  const [subjectsById, setSubjectsById] = useState<Record<string, Subject>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadSchedule(scope), loadCourses(scope)]).then(([sched, list]) => {
      if (cancelled) return;
      setExamSchedule(sched.exam);
      setSubjectsById(Object.fromEntries(list.map((s) => [s.id, s])));
    });
    return () => {
      cancelled = true;
    };
  }, [scope]);

  const title = scope.examPeriod === "uas" ? "Jadwal UAS" : "Jadwal UTS";

  // Group the exam cards: Onsite first, then Assignment/Tugas; each by date.
  const rank = (e: Schedule) => (examCategory(e) === "onsite" ? 0 : 1);
  const sortedExams = [...examSchedule].sort((a, b) => {
    const r = rank(a) - rank(b);
    return r !== 0
      ? r
      : new Date(a.examDate ?? 0).getTime() - new Date(b.examDate ?? 0).getTime();
  });
  const groupMeta = {
    onsite: {
      label: "Ujian Onsite",
      count: examSchedule.filter((e) => examCategory(e) === "onsite").length,
    },
    assignment: {
      label: "Assignment & Tugas",
      count: examSchedule.filter((e) => examCategory(e) !== "onsite").length,
    },
  };

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
          {title}
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

        {examSchedule.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-10 text-center text-sm text-muted-foreground">
            Jadwal {scope.examPeriod === "uas" ? "UAS" : "UTS"} belum diumumkan untuk periode ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sortedExams.map((exam, idx) => {
              const cat = examCategory(exam);
              const showHeader =
                idx === 0 || examCategory(sortedExams[idx - 1]) !== cat;
              const subject = subjectsById[exam.subjectId];
              // Color from the subject's own `color` field (scope-driven) so any
              // scope's subjects get distinct accents without a hardcoded id map.
              const iconColor = subject?.color || "text-primary";
              const hasDate = !!exam.examDate;
              const typeLabel =
                exam.examType === "onsite"
                  ? "Onsite Exam"
                  : exam.examType === "assignment"
                    ? "Assignment"
                    : "Online Exam";
              // Onsite = timed window; online/assignment = a single deadline.
              const isWindow = exam.examType === "onsite";
              // Explicit link wins; online exams fall back to the BINUS portal so
              // existing scopes keep their link. Assignments show none unless set.
              const link =
                exam.examLink ??
                (exam.examType === "online" ? "https://exam.apps.binus.ac.id" : null);

              const cardHeader = (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0 bg-muted">
                    {subject ? (
                      <SubjectIcon icon={subject.icon} className={`h-5 w-5 ${iconColor}`} />
                    ) : (
                      <BookOpen className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                      {exam.subject}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {typeLabel}
                      </span>
                      {exam.examFormat && (
                        <span className="text-[10px] text-muted-foreground">
                          {exam.examFormat}
                        </span>
                      )}
                    </div>
                    {exam.examNote && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {exam.examNote}
                      </p>
                    )}
                  </div>
                </>
              );

              return (
                <Fragment key={`${exam.subjectId}-${exam.examDate ?? idx}`}>
                  {showHeader && (
                    <h3 className="sm:col-span-2 flex items-center gap-2 pt-2 text-sm font-semibold text-foreground/80 first:pt-0">
                      {cat === "onsite" ? (
                        <MapPin className="h-4 w-4 text-primary" />
                      ) : (
                        <ClipboardList className="h-4 w-4 text-primary" />
                      )}
                      {groupMeta[cat].label}
                      <span className="text-[10px] font-normal text-muted-foreground">
                        ({groupMeta[cat].count})
                      </span>
                    </h3>
                  )}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  {subject ? (
                    <Link
                      href={`/${scopePath}/subject/${exam.subjectId}`}
                      className="flex items-start gap-3 group"
                    >
                      {cardHeader}
                    </Link>
                  ) : (
                    <div className="flex items-start gap-3">{cardHeader}</div>
                  )}

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
                        {isWindow
                          ? `${exam.startTime} – ${exam.endTime} WIB`
                          : `Deadline ${exam.startTime} WIB`}
                      </span>
                    ) : (
                      <span className="italic">{t("schedule.not_announced")}</span>
                    )}
                  </div>

                  {link && (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {link.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  )}
                  </div>
                </Fragment>
              );
            })}
          </div>
        )}
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
