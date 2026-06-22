"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Subject } from "@/types";
import { SubjectCard } from "./subject-card";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { useNotifications } from "@/hooks/use-notifications";
import { useForumUnread } from "@/hooks/use-forum-unread";
import { useOptionalScope } from "@/components/providers/scope-provider";
import { loadCourses } from "@/data";
import { DEFAULT_SCOPE } from "@/lib/scope";

export function SubjectGrid() {
  const { notifications } = useNotifications();
  const forumUnread = useForumUnread(notifications);
  const scopeCtx = useOptionalScope();
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadCourses(scopeCtx?.scope ?? DEFAULT_SCOPE).then((list) => {
      if (!cancelled) setSubjects(list);
    });
    return () => {
      cancelled = true;
    };
  }, [scopeCtx?.scope]);

  if (subjects.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          Mata kuliah belum tersedia untuk periode ini. Akan diisi mendekati periode ujian.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-heading text-sm font-semibold text-muted-foreground">
        Mata Kuliah
      </h3>
      <motion.div
        id="subjects"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        variants={staggerContainer(0.05)}
        initial="hidden"
        animate="visible"
      >
        {subjects.map((subject) => (
          <motion.div key={subject.id} variants={staggerItem}>
            <SubjectCard
              subject={subject}
              hasForumUnread={forumUnread.hasUnread(subject.id)}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
