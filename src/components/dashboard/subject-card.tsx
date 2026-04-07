"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Subject } from "@/types";
import { SubjectIcon } from "@/components/shared/subject-icon";
import { springSmooth, hoverLift, tapScale } from "@/lib/motion";

interface SubjectCardProps {
  subject: Subject;
  progress?: number; // 0-100
  hasForumUnread?: boolean;
}

export function SubjectCard({ subject, progress = 0, hasForumUnread }: SubjectCardProps) {

  return (
    <motion.div
      whileHover={hoverLift}
      whileTap={tapScale}
      transition={springSmooth}
    >
      <Link
        href={`/subject/${subject.id}`}
        className="group relative flex flex-col rounded-xl border border-border bg-card overflow-hidden transition-colors duration-200 hover:border-primary/30 hover:shadow-warm-lg"
      >
        {hasForumUnread && (
          <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-destructive z-10" />
        )}
        {/* Content with icon */}
        <div className="p-5 flex items-start gap-4">
          <SubjectIcon
            icon={subject.icon}
            className={`h-12 w-12 shrink-0 ${subject.color}`}
          />
          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-base font-bold truncate">
              {subject.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {subject.description}
            </p>

            {/* Progress bar */}
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
                {progress}%
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
