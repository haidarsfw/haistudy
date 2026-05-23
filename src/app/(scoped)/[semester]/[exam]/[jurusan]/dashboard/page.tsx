"use client";

import { useSession } from "@/components/providers/session-provider";
import { GreetingCard } from "@/components/dashboard/greeting-card";
import { ExamCountdownMini } from "@/components/dashboard/exam-countdown-mini";
import { StudyProgressMini } from "@/components/dashboard/study-progress-mini";
import { QuickNoteCard } from "@/components/dashboard/quick-note-card";
import { OnlineUsersMini } from "@/components/dashboard/online-users-mini";
import { QuickStudyCard } from "@/components/dashboard/quick-study-card";

export default function DashboardPage() {
  const { session } = useSession();


  if (!session) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 dash-stagger-root">
      <div className="flex flex-col gap-6">
        {/* Row 1: Greeting (full width, includes tips+facts+countdown) */}
        <div className="dash-stagger-item">
          <GreetingCard />
        </div>

        {/* Row 2: 4 compact stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 dash-stagger-item">
          <ExamCountdownMini />
          <StudyProgressMini />
          <QuickNoteCard />
          <OnlineUsersMini />
        </div>

        {/* Row 3: Quick Study (full width) */}
        <div className="dash-stagger-item">
          <QuickStudyCard />
        </div>
      </div>
    </div>
  );
}
