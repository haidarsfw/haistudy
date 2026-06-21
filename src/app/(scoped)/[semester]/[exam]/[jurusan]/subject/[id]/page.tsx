"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/components/providers/session-provider";
import { useScope } from "@/components/providers/scope-provider";
import { useScopedData } from "@/components/providers/scoped-data-provider";
import { useSettings } from "@/hooks/use-settings";
import { useProgress } from "@/hooks/use-progress";
import { useNotifications } from "@/hooks/use-notifications";
import { useForumUnread } from "@/hooks/use-forum-unread";
import { SubjectIcon } from "@/components/shared/subject-icon";
import { TabNav } from "@/components/subject/tab-nav";
import { MateriTab } from "@/components/subject/materi-tab";
import { RangkumanTab } from "@/components/subject/rangkuman-tab";
import { KisiKisiTab } from "@/components/subject/kisi-kisi-tab";
import { sounds } from "@/lib/sounds";
import { FlashcardsTab } from "@/components/subject/flashcards-tab";
import { QuizTab } from "@/components/subject/quiz-tab";
import { PersonalNotesTab } from "@/components/subject/personal-notes-tab";
import { ForumTab } from "@/components/forum/forum-tab";
import { PreviewLock } from "@/components/shared/preview-lock";
import { KilatLaunch } from "@/components/kilat/kilat-launch";
import { ExamLaunch } from "@/components/exam/exam-launch";
import { ChevronRight, Lightbulb, X } from "lucide-react";

// YYYY-MM-DD in WIB (UTC+7). Gates the once-per-day tip dismissal.
function tipTodayKey(): string {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

export default function SubjectPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useSession();
  const { scope, scopePath, scopeKey } = useScope();
  // Merge Flashcards + Quiz into one "Hafalan & Kuis" tab for s2/UAS/BM and any
  // later cohort; earlier scopes keep the two tabs separate.
  const mergeHafalanKuis =
    scope.semester > 2 || (scope.semester === 2 && scope.examPeriod === "uas");
  const subjectId = params.id as string;
  const dashboardHref = `/${scopePath}/dashboard`;
  const subjectsHref = `/${scopePath}/subjects`;

  const initialTab = Number(searchParams.get("tab")) || 0;
  const [activeTab, setActiveTab] = useState(initialTab);
  // Tip dismissal persists for the day (survives reload), resets at midnight WIB
  // or on relogin (login clears the key). Init false to avoid an SSR/localStorage
  // mismatch; an effect reveals it after mount when not dismissed today.
  const [showTip, setShowTip] = useState(false);
  useEffect(() => {
    try {
      setShowTip(localStorage.getItem("hs-tip-dismissed") !== tipTodayKey());
    } catch {
      setShowTip(true);
    }
  }, []);
  const dismissTip = useCallback(() => {
    try {
      localStorage.setItem("hs-tip-dismissed", tipTodayKey());
    } catch {}
    setShowTip(false);
  }, []);
  // Tip only on the calc/slide-heavy s2-uas-bm subjects; other scopes unchanged.
  const tipAllowed =
    scopeKey === "s2-uas-bm"
      ? ["opsmgmt", "akuntansi"].includes(subjectId)
      : true;
  // Track which tabs have been visited. Once a tab mounts it stays mounted
  // to preserve scroll position, TTS state, and form drafts across switches.
  const [visited, setVisited] = useState<Set<number>>(() => new Set([initialTab]));
  const handleTabChange = useCallback((tab: number) => {
    setActiveTab(tab);
    setVisited((v) => (v.has(tab) ? v : new Set(v).add(tab)));
  }, []);
  // Sub-view inside the merged "Hafalan & Kuis" tab (id 11).
  const [hkSub, setHkSub] = useState<"flash" | "quiz">("flash");

  const {
    subjects,
    content: scopedContent,
    loaded: scopedLoaded,
    rangkuman,
    rangkumanLoaded,
    kilat,
    kilatLoaded,
    examData,
    examDataLoaded,
  } = useScopedData();
  const hasKilat = kilatLoaded && !!kilat[subjectId];
  const hasExam = examDataLoaded && !!examData[subjectId];
  const subject = useMemo(() => subjects.find((s) => s.id === subjectId), [subjects, subjectId]);
  const content = scopedContent[subjectId] ?? null;
  const loaded = scopedLoaded;

  const { settings, updateSettings } = useSettings();

  // Track subject visit for "Lanjut Belajar" dashboard
  useEffect(() => {
    const recent = settings.recentSubjects ?? [];
    // Already most recent - no update needed
    if (recent[0] === subjectId) return;
    const updated = [subjectId, ...recent.filter((id) => id !== subjectId)].slice(0, 5);
    updateSettings({ recentSubjects: updated });
  }, [subjectId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Tab counts + dots - memoized BEFORE the early returns so hook order
  // stays stable across loaded/empty/loaded transitions (avoids React #310).
  const tabCounts = useMemo<Record<number, number>>(
    () => ({
      0: content?.materi.filter((m) => !m.tab).length ?? 0,
      2: content?.kisiKisi.length ?? 0,
      3: content?.flashcards.length ?? 0,
      4: content?.quiz.length ?? 0,
      7: content?.materi.filter((m) => m.tab === "diktat").length ?? 0,
      8: content?.materi.filter((m) => m.tab === "soal").length ?? 0,
    }),
    [
      content?.materi,
      content?.kisiKisi.length,
      content?.flashcards.length,
      content?.quiz.length,
    ]
  );
  const subjectHasForumUnread = forumUnread.hasUnread(subjectId);
  const tabDots = useMemo<Record<number, boolean> | undefined>(
    () => (subjectHasForumUnread ? { 5: true } : undefined),
    [subjectHasForumUnread]
  );

  // Diktat (7) + Soal (8) are opt-in: hidden unless the subject tags materi for
  // them. The standard content tabs (Rangkuman/Kisi-Kisi/Flashcards/Quiz) stay
  // visible even when empty — each renders its own "belum tersedia" note — so a
  // slides-only subject still exposes every tab. The lone exception is a subject
  // that ships Diktat/Soal alt-content (e.g. CB Pancasila): there those replace
  // the standard tabs, so we hide the empty ones to avoid dead panels.
  const hiddenTabs = useMemo<Set<number>>(() => {
    const h = new Set<number>();
    if (!content) return h;
    const hasAltContent = content.materi.some(
      (m) => m.tab === "diktat" || m.tab === "soal"
    );
    if (hasAltContent) {
      if (rangkumanLoaded && Object.keys(rangkuman[subjectId] ?? {}).length === 0) h.add(1);
      if (content.kisiKisi.length === 0) h.add(2);
      if (content.flashcards.length === 0) h.add(3);
      if (content.quiz.length === 0) h.add(4);
    }
    if (content.materi.every((m) => m.tab !== "diktat")) h.add(7);
    if (content.materi.every((m) => m.tab !== "soal")) h.add(8);
    // Belajar Kilat (9) only shows once we've confirmed a feed exists.
    if (!hasKilat) h.add(9);
    // Latihan Soal (10) only shows for subjects with exam data.
    if (!hasExam) h.add(10);
    // Hafalan & Kuis merge (11): replaces Flashcards (3) + Quiz (4) for s2/uas/bm+.
    if (mergeHafalanKuis) {
      h.add(3);
      h.add(4);
      if (content.flashcards.length === 0 && content.quiz.length === 0) h.add(11);
    } else {
      h.add(11);
    }
    return h;
  }, [content, rangkuman, rangkumanLoaded, subjectId, hasKilat, hasExam, mergeHafalanKuis]);

  // If the active tab is hidden (e.g. a deep-link to an empty tab), fall back
  // to Materi. Don't bounce off the Belajar Kilat tab (9) while the feed is
  // still loading - a cold deep-link to ?tab=9 must wait until we know whether
  // a feed exists before deciding.
  useEffect(() => {
    if (activeTab === 9 && !kilatLoaded) return;
    if (activeTab === 10 && !examDataLoaded) return;
    // Merge mode: a deep-link to the old Flashcards/Quiz tabs lands on the
    // combined "Hafalan & Kuis" tab instead of bouncing to Materi.
    if (mergeHafalanKuis && (activeTab === 3 || activeTab === 4)) {
      setActiveTab(11);
      setVisited((v) => (v.has(11) ? v : new Set(v).add(11)));
      return;
    }
    if (hiddenTabs.has(activeTab)) setActiveTab(0);
  }, [hiddenTabs, activeTab, kilatLoaded, examDataLoaded, mergeHafalanKuis]);

  // Ensure any programmatically-selected tab (e.g. the merge redirect) is marked
  // visited so its lazy panel mounts.
  useEffect(() => {
    setVisited((v) => (v.has(activeTab) ? v : new Set(v).add(activeTab)));
  }, [activeTab]);

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

  const percent = getCompletionPercent(
    content.materi.length,
    content.flashcards.length > 0,
    content.quiz.length > 0,
    hasKilat
  );

  // Progress ring values
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  // Diktat + Soal Ujian get their own tabs (tagged via materi `tab`); the
  // Materi tab shows only untagged items (e.g. lecture slides).
  const materiMain = content.materi.filter((m) => !m.tab);
  const materiDiktat = content.materi.filter((m) => m.tab === "diktat");
  const materiSoal = content.materi.filter((m) => m.tab === "soal");

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

      {/* Slide-based learning tip (gated per scope/subject) */}
      {showTip && tipAllowed && (
        <div className="mx-4 mt-3 flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5">
          <Lightbulb className="h-4 w-4 shrink-0 text-primary mt-0.5" />
          <p className="flex-1 text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Tips:</span>{" "}
            Mata kuliah ini sangat disarankan untuk dipelajari sembari membuka slide materi asli dari BINUSMAYA. Gunakan fitur <span className="font-medium text-foreground">AI haistudy</span> untuk membantu memahami materi dengan lebih mudah. Kamu juga bisa pilih (select) teks yang kurang kamu pahami lalu langsung tanya AI, tanpa perlu screenshot - dan kamu tetap bisa upload screenshot slide kalau mau.
          </p>
          <button
            onClick={dismissTip}
            className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Tab navigation */}
      <TabNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        counts={tabCounts}
        tabDots={tabDots}
        hiddenTabs={hiddenTabs}
      />

      {/* Tab content - all tabs stay mounted after first visit. Hidden panels
          skip painting + receive no pointer events. CSS keyframe fades in
          the active panel. Keeps scroll/TTS/draft state across switches. */}
      <div className="px-4">
        <div className="tab-panel" hidden={activeTab !== 0}>
          {visited.has(0) && (
            <PreviewLock title="Materi">
              <MateriTab
                items={materiMain}
                completedIds={progress.materi}
                onToggleComplete={handleMateriToggle}
                subjectId={subjectId}
                highlightTitle={searchParams.get("highlight") || undefined}
              />
            </PreviewLock>
          )}
        </div>

        <div className="tab-panel" hidden={activeTab !== 9}>
          {visited.has(9) && (
            <PreviewLock title="Belajar Kilat">
              <KilatLaunch subjectId={subjectId} />
            </PreviewLock>
          )}
        </div>

        <div className="tab-panel" hidden={activeTab !== 10}>
          {visited.has(10) && hasExam && (
            <PreviewLock title="Latihan Soal">
              <ExamLaunch
                exam={examData[subjectId]}
                subjectId={subjectId}
                onStartExam={() =>
                  router.push(`/${scopePath}/subject/${subjectId}/latihan`)
                }
                onViewAttempt={(attemptId) =>
                  router.push(
                    `/${scopePath}/subject/${subjectId}/latihan/riwayat?attemptId=${attemptId}`
                  )
                }
                onDeleteAttempt={async (attemptId) => {
                  try {
                    await fetch("/api/exam/history", {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ attemptId }),
                    });
                    // Force page reload to refresh history
                    router.refresh();
                  } catch (err) {
                    console.error("Delete failed:", err);
                  }
                }}
              />
            </PreviewLock>
          )}
        </div>

        <div className="tab-panel" hidden={activeTab !== 7}>
          {visited.has(7) && (
            <PreviewLock title="Diktat">
              <MateriTab
                items={materiDiktat}
                completedIds={progress.materi}
                onToggleComplete={handleMateriToggle}
                subjectId={subjectId}
              />
            </PreviewLock>
          )}
        </div>

        <div className="tab-panel" hidden={activeTab !== 8}>
          {visited.has(8) && (
            <PreviewLock title="Soal Ujian">
              <MateriTab
                items={materiSoal}
                completedIds={progress.materi}
                onToggleComplete={handleMateriToggle}
                subjectId={subjectId}
              />
            </PreviewLock>
          )}
        </div>

        <div className="tab-panel" hidden={activeTab !== 1}>
          {visited.has(1) && (
            <PreviewLock title="Rangkuman">
              <RangkumanTab
                subjectId={subjectId}
                initialModule={searchParams.get("module") || undefined}
                highlightText={searchParams.get("highlight") || undefined}
              />
            </PreviewLock>
          )}
        </div>

        <div className="tab-panel" hidden={activeTab !== 2}>
          {visited.has(2) && (
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
        </div>

        <div className="tab-panel" hidden={activeTab !== 3}>
          {visited.has(3) && (
            <PreviewLock title="Flashcards">
              <FlashcardsTab
                items={content.flashcards}
                onComplete={handleFlashcardsComplete}
                subjectId={subjectId}
              />
            </PreviewLock>
          )}
        </div>

        <div className="tab-panel" hidden={activeTab !== 4}>
          {visited.has(4) && (
            <PreviewLock title="Quiz">
              <QuizTab
                questions={content.quiz}
                onScoreSave={(score, total) => saveQuizScore(score, total)}
                subjectId={subjectId}
              />
            </PreviewLock>
          )}
        </div>

        {/* Merged Hafalan & Kuis (id 11) — Flashcards + Quiz with a sub-toggle */}
        <div className="tab-panel" hidden={activeTab !== 11}>
          {visited.has(11) && (
            <PreviewLock title="Drill">
              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => { sounds.click(); setHkSub("flash"); }}
                  className={`hs-press flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                    hkSub === "flash"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Flashcards
                  {content.flashcards.length > 0 && (
                    <span className="text-[10px] text-muted-foreground/70">({content.flashcards.length})</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { sounds.click(); setHkSub("quiz"); }}
                  className={`hs-press flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                    hkSub === "quiz"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Quiz
                  {content.quiz.length > 0 && (
                    <span className="text-[10px] text-muted-foreground/70">({content.quiz.length})</span>
                  )}
                </button>
              </div>
              <div hidden={hkSub !== "flash"}>
                <FlashcardsTab
                  items={content.flashcards}
                  onComplete={handleFlashcardsComplete}
                  subjectId={subjectId}
                />
              </div>
              <div hidden={hkSub !== "quiz"}>
                <QuizTab
                  questions={content.quiz}
                  onScoreSave={(score, total) => saveQuizScore(score, total)}
                  subjectId={subjectId}
                />
              </div>
            </PreviewLock>
          )}
        </div>

        <div className="tab-panel" hidden={activeTab !== 5}>
          {visited.has(5) && (
            <PreviewLock title="Forum">
              <ForumTab subjectId={subjectId} />
            </PreviewLock>
          )}
        </div>

        <div className="tab-panel" hidden={activeTab !== 6}>
          {visited.has(6) && session && (
            <div className="py-4">
              <PersonalNotesTab
                subjectId={subjectId}
                licenseKey={session.licenseKey}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
