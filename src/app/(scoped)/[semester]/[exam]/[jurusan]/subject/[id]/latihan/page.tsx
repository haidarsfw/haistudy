"use client";

import { useParams, useRouter } from "next/navigation";
import { useScope } from "@/components/providers/scope-provider";
import { useScopedData } from "@/components/providers/scoped-data-provider";
import dynamic from "next/dynamic";

// Lazy-load the heavy exam player (KaTeX, markdown, scratchpad, cheat sheet) so
// it stays out of the surrounding bundle. The route's loading.tsx covers the
// RSC wait; this fallback covers the brief client chunk fetch.
const ExamPlayer = dynamic(
  () => import("@/components/exam/exam-player").then((m) => ({ default: m.ExamPlayer })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    ),
  }
);

/**
 * Fullscreen exam route: /[scope]/subject/[id]/latihan
 *
 * Opens the ExamPlayer overlay for the subject's exam.
 * On close, navigates back to the subject page with the exam tab active.
 */
export default function LatihanPage() {
  const params = useParams();
  const router = useRouter();
  const { scopePath } = useScope();
  const subjectId = params.id as string;

  const { examData, examDataLoaded } = useScopedData();

  const handleClose = () => {
    router.push(`/${scopePath}/subject/${subjectId}?tab=10`);
  };

  if (!examDataLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const exam = examData[subjectId];
  if (!exam) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">
          Latihan soal belum tersedia untuk mata kuliah ini.
        </p>
        <button
          onClick={handleClose}
          className="text-sm text-primary hover:underline"
        >
          Kembali
        </button>
      </div>
    );
  }

  return (
    <ExamPlayer
      exam={exam}
      subjectId={subjectId}
      onClose={handleClose}
    />
  );
}
