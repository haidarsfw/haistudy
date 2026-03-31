"use client";

import { motion } from "framer-motion";
import { useSession } from "@/components/providers/session-provider";
import { usePresence } from "@/hooks/use-presence";
import { GreetingCard } from "@/components/dashboard/greeting-card";
import { ExamCountdownMini } from "@/components/dashboard/exam-countdown-mini";
import { StudyProgressMini } from "@/components/dashboard/study-progress-mini";
import { QuickNoteCard } from "@/components/dashboard/quick-note-card";
import { OnlineUsersMini } from "@/components/dashboard/online-users-mini";
import { QuickStudyCard } from "@/components/dashboard/quick-study-card";
import { staggerContainer, staggerItem } from "@/lib/motion";

export default function DashboardPage() {
  const { session } = useSession();

  // Set up presence tracking
  usePresence();

  if (!session) return null;

  return (
    <motion.div
      className="mx-auto max-w-5xl px-4 py-6"
      variants={staggerContainer(0.08)}
      initial="hidden"
      animate="visible"
    >
      <div className="flex flex-col gap-6">
        {/* Row 1: Greeting (full width, includes tips+facts+countdown) */}
        <motion.div variants={staggerItem}>
          <GreetingCard />
        </motion.div>

        {/* Row 2: 4 compact stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ExamCountdownMini />
          <StudyProgressMini />
          <QuickNoteCard />
          <OnlineUsersMini />
        </div>

        {/* Row 3: Quick Study (full width) */}
        <motion.div variants={staggerItem}>
          <QuickStudyCard />
        </motion.div>
      </div>
    </motion.div>
  );
}
