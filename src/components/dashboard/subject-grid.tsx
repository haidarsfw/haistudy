"use client";

import { motion } from "framer-motion";
import { subjects } from "@/data/subjects";
import { SubjectCard } from "./subject-card";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { useNotifications } from "@/hooks/use-notifications";
import { useForumUnread } from "@/hooks/use-forum-unread";

export function SubjectGrid() {
  const { notifications } = useNotifications();
  const forumUnread = useForumUnread(notifications);
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
              // TODO: Wire up actual progress
              progress={0}
              hasForumUnread={forumUnread.hasUnread(subject.id)}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
