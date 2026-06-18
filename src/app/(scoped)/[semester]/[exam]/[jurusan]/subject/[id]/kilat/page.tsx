"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useScope } from "@/components/providers/scope-provider";
import { useScopedData } from "@/components/providers/scoped-data-provider";
import { useProgress } from "@/hooks/use-progress";
import { useSession } from "@/components/providers/session-provider";
import { KilatPlayer } from "@/components/kilat/kilat-player";

export default function KilatPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.id as string;
  const { scopePath } = useScope();
  const { kilat, kilatLoaded } = useScopedData();
  const { session } = useSession();
  const { progress, saveKilatState } = useProgress(subjectId);
  // One tick after mount so useProgress has read localStorage before the player
  // seeds its resume state.
  const [ready, setReady] = useState(false);

  const feed = kilat[subjectId];
  const subjectHref = `/${scopePath}/subject/${subjectId}?tab=9`;

  useEffect(() => {
    setReady(true);
  }, []);

  // Preview users see the standard lock on the tab; block the deep-link too.
  useEffect(() => {
    if (session?.isPreview) router.replace(subjectHref);
  }, [session?.isPreview, router, subjectHref]);

  // No feed for this subject -> back to the subject page.
  useEffect(() => {
    if (kilatLoaded && !feed) {
      router.replace(`/${scopePath}/subject/${subjectId}`);
    }
  }, [kilatLoaded, feed, router, scopePath, subjectId]);

  if (!kilatLoaded || !feed || !ready || session?.isPreview) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <KilatPlayer
      feed={feed}
      initial={progress.kilat}
      onPersist={saveKilatState}
      onClose={() => router.push(subjectHref)}
    />
  );
}
