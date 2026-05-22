"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Play, ArrowRight } from "lucide-react";
import { fadeInUp } from "@/lib/motion";
import { SubjectIcon } from "@/components/shared/subject-icon";
import { useTranslation } from "@/components/providers/language-provider";
import { useSettings } from "@/hooks/use-settings";
import { useScopedData } from "@/components/providers/scoped-data-provider";
import { useOptionalScope } from "@/components/providers/scope-provider";

export function QuickStudyCard() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { subjects } = useScopedData();
  const scopeCtx = useOptionalScope();
  const base = scopeCtx ? `/${scopeCtx.scopePath}` : "";

  // Show last 3 visited subjects, padded with defaults to always show 3
  const recentIds = settings.recentSubjects ?? [];
  const recentSubjects = recentIds
    .map((id) => subjects.find((s) => s.id === id))
    .filter(Boolean) as typeof subjects;
  // Pad with subjects not already in recent list
  const remaining = subjects.filter((s) => !recentIds.includes(s.id));
  const quickSubjects = [...recentSubjects, ...remaining].slice(0, 3);

  if (quickSubjects.length === 0) return null;

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
            href={`${base}/subject/${subject.id}`}
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
        href={`${base}/subjects`}
        className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
      >
        {t("dashboard.view_all")}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </motion.div>
  );
}
