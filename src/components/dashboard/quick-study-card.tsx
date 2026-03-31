"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Play, ArrowRight } from "lucide-react";
import { fadeInUp } from "@/lib/motion";
import { subjects } from "@/data/subjects";
import { SubjectIcon } from "@/components/shared/subject-icon";
import { useTranslation } from "@/components/providers/language-provider";

export function QuickStudyCard() {
  const { t } = useTranslation();
  // Show first 3 subjects as quick study shortcuts
  const quickSubjects = subjects.slice(0, 3);

  return (
    <motion.div data-onboarding="subjects" className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/20 light-card-shadow" variants={fadeInUp} initial="hidden" animate="visible">
      <div className="flex items-center gap-2 mb-4">
        <Play className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{t("dashboard.continue_studying")}</h3>
      </div>

      <div className="space-y-2">
        {quickSubjects.map((subject) => (
          <Link
            key={subject.id}
            href={`/subject/${subject.id}`}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent group"
          >
            <SubjectIcon
              icon={subject.icon}
              className={`h-5 w-5 shrink-0 ${subject.color}`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{subject.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {subject.description}
              </p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
          </Link>
        ))}
      </div>

      <Link
        href="/subjects"
        className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
      >
        {t("dashboard.view_all")}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </motion.div>
  );
}
