"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/components/providers/session-provider";
import { useScope } from "@/components/providers/scope-provider";
import { loadSubjectById, loadContent } from "@/data";
import type { Subject, SubjectContent } from "@/types";
import { useSettings } from "@/hooks/use-settings";
import { useProgress } from "@/hooks/use-progress";
import { useNotifications } from "@/hooks/use-notifications";
import { useForumUnread } from "@/hooks/use-forum-unread";
import { SubjectIcon } from "@/components/shared/subject-icon";
import { TabNav } from "@/components/subject/tab-nav";
import { PreviewLock } from "@/components/shared/preview-lock";
import { durationFast } from "@/lib/motion";
import { ChevronRight, Lightbulb, X } from "lucide-react";

// Tabs are lazy-loaded so RangkumanTab (with its useTTS hook chain) only
// mounts when the user clicks tab 1, not on initial subject-page load.
// Fixes a production React #310 that surfaced when all tab modules loaded
// together. ssr:false is legal here because this page is "use client".
const MateriTab = dynamic(
  () => import("@/components/subject/materi-tab").then((m) => ({ default: m.MateriTab })),
  { ssr: false }
);
const RangkumanTab = dynamic(
  () => import("@/components/subject/rangkuman-tab").then((m) => ({ default: m.RangkumanTab })),
  { ssr: false }
);
const KisiKisiTab = dynamic(
  () => import("@/components/subject/kisi-kisi-tab").then((m) => ({ default: m.KisiKisiTab })),
  { ssr: false }
);
const FlashcardsTab = dynamic(
  () => import("@/components/subject/flashcards-tab").then((m) => ({ default: m.FlashcardsTab })),
  { ssr: false }
);
const QuizTab = dynamic(
  () => import("@/components/subject/quiz-tab").then((m) => ({ default: m.QuizTab })),
  { ssr: false }
);
const PersonalNotesTab = dynamic(
  () => import("@/components/subject/personal-notes-tab").then((m) => ({ default: m.PersonalNotesTab })),
  { ssr: false }
);
const ForumTab = dynamic(
  () => import("@/components/forum/forum-tab").then((m) => ({ default: m.ForumTab })),
  { ssr: false }
);

export default function SubjectPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useSession();
  const { scope, scopePath } = useScope();
  const subjectId = params.id as string;
  const dashboardHref = `/${scopePath}/dashboard`;
  const subjectsHref = `/${scopePath}/subjects`;

  const initialTab = Number(searchParams.get("tab")) || 0;
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showTip, setShowTip] = useState(true);
  const [subject, setSubject] = useState<Subject | undefined>(undefined);
  const [content, setContent] = useState<SubjectContent | null>(null);
  const [loaded, setLoaded] = useState(false);

  const { settings, updateSettings } = useSettings();

  // Track subject visit for "Lanjut Belajar" dashboard
  useEffect(() => {
    const recent = settings.recentSubjects ?? [];
    // Already most recent — no update needed
    if (recent[0] === subjectId) return;
    const updated = [subjectId, ...recent.filter((id) => id !== subjectId)].slice(0, 5);
    updateSettings({ recentSubjects: updated });
  }, [subjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Async scope-aware load
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    (async () => {
      const [s, c] = await Promise.all([
        loadSubjectById(scope, subjectId),
        loadContent(scope, subjectId) as Promise<SubjectContent | null>,
      ]);
      if (cancelled) return;
      setSubject(s);
      setContent(c);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [scope, subjectId]);

  const { notifications } = useNotifications();
  const forumUnread = useForumUnread(notifications);

  const {
    progress,
    markMateriCompleted,
    markMateriIncomplete,
    setFlashcardsCompleted,
    saveQuizScore,
    getCompletionPercent,
  } = useProgress(subjectId);

  const handleMateriToggle = useCallback(
    (id: number, completed: boolean) => {
      if (completed) {
        markMateriCompleted(id);
      } else {
        markMateriIncomplete(id);
      }
    },
    [markMateriCompleted, markMateriIncomplete]
  );

  const handleFlashcardsComplete = useCallback(
    () => setFlashcardsCompleted(true),
    [setFlashcardsCompleted]
  );

  if (!loaded) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!subject || !content) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">
          Materi belum tersedia untuk periode ini.
        </p>
        <button
          onClick={() => router.push(dashboardHref)}
          className="text-sm text-primary hover:underline"
        >
          Kembali ke Dashboard
        </button>
      </div>
    );
  }

  // Calculate per-subject progress using the unified weighted formula
  const percent = getCompletionPercent(
    content.materi.length,
    content.flashcards.length > 0,
    content.quiz.length > 0
  );

  // Tab counts
  const tabCounts: Record<number, number> = {
    0: content.materi.length,
    2: content.kisiKisi.length,
    3: content.flashcards.length,
    4: content.quiz.length,
  };

  // Progress ring values
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="mx-auto max-w-5xl overflow-x-hidden">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 px-4 pt-3 pb-1 text-xs text-muted-foreground overflow-hidden">
        <button
          onClick={() => router.push(dashboardHref)}
          className="hover:text-foreground transition-colors"
        >
          Dashboard
        </button>
        <ChevronRight className="h-3 w-3" />
        <button
          onClick={() => router.push(subjectsHref)}
          className="hover:text-foreground transition-colors"
        >
          Mata Kuliah
        </button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium truncate max-w-[150px]">
          {subject.name}
        </span>
      </nav>

      {/* Subject header with progress ring */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-4">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 ${subject.color}`}
        >
          <SubjectIcon icon={subject.icon} className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-heading text-lg font-bold">{subject.name}</h1>
          <p className="text-xs text-muted-foreground">
            {subject.description}
          </p>
        </div>

        {/* Progress ring */}
        <div className="relative flex h-12 w-12 items-center justify-center shrink-0">
          <svg className="h-12 w-12 -rotate-90">
            <circle
              cx="24"
              cy="24"
              r={radius}
              className="fill-none stroke-muted"
              strokeWidth="3"
            />
            <circle
              cx="24"
              cy="24"
              r={radius}
              className="fill-none stroke-primary transition-all duration-700"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <span className="absolute text-[11px] font-bold">{percent}%</span>
        </div>
      </div>

      {/* Slide-based learning tip for specific subjects */}
      {showTip && ["statistik", "akuntansi", "biseko"].includes(subjectId) && (
        <div className="mx-4 mt-3 flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5">
          <Lightbulb className="h-4 w-4 shrink-0 text-primary mt-0.5" />
          <p className="flex-1 text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Tips:</span>{" "}
            Mata kuliah ini sangat disarankan untuk dipelajari sembari membuka slide materi asli dari BINUSMAYA. Gunakan fitur <span className="font-medium text-foreground">AI haistudy</span> untuk membantu memahami materi dengan lebih mudah — kamu juga bisa upload gambar slide yang kurang kamu pahami!
          </p>
          <button
            onClick={() => setShowTip(false)}
            className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Tab navigation */}
      <TabNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={tabCounts}
        tabDots={forumUnread.hasUnread(subjectId) ? { 5: true } : undefined}
      />

      {/* Tab content */}
      <div className="px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={durationFast}
          >
            {activeTab === 0 && (
              <PreviewLock title="Materi">
                <MateriTab
                  items={content.materi}
                  completedIds={progress.materi}
                  onToggleComplete={handleMateriToggle}
                  subjectId={subjectId}
                  highlightTitle={searchParams.get("highlight") || undefined}
                />
              </PreviewLock>
            )}

            {activeTab === 1 && (
              <PreviewLock title="Rangkuman">
                <RangkumanTab
                  subjectId={subjectId}
                  initialModule={searchParams.get("module") || undefined}
                  highlightText={searchParams.get("highlight") || undefined}
                />
              </PreviewLock>
            )}

            {activeTab === 2 && (
              <PreviewLock title="Kisi-Kisi">
                <KisiKisiTab
                  items={content.kisiKisi}
                  note={content.kisiKisiNote}
                  info={content.kisiKisiInfo}
                  attachments={content.kisiKisiAttachments}
                  subjectId={subjectId}
                />
              </PreviewLock>
            )}

            {activeTab === 3 && (
              <PreviewLock title="Flashcards">
                <FlashcardsTab
                  items={content.flashcards}
                  onComplete={handleFlashcardsComplete}
                  subjectId={subjectId}
                />
              </PreviewLock>
            )}

            {activeTab === 4 && (
              <PreviewLock title="Quiz">
                <QuizTab
                  questions={content.quiz}
                  onScoreSave={(score, total) => saveQuizScore(score, total)}
                  subjectId={subjectId}
                />
              </PreviewLock>
            )}

            {activeTab === 5 && (
              <PreviewLock title="Forum">
                <ForumTab subjectId={subjectId} />
              </PreviewLock>
            )}

            {activeTab === 6 && session && (
              <div className="py-4">
                <PersonalNotesTab
                  subjectId={subjectId}
                  licenseKey={session.licenseKey}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
