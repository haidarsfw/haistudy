"use client";

import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { useSession } from "@/components/providers/session-provider";
import { usePreviewGuard } from "@/hooks/use-preview-guard";
import { useThreads } from "@/hooks/use-threads";
import { usePolls } from "@/hooks/use-polls";
import { ThreadList } from "./thread-list";
import { ThreadForm } from "./thread-form";
import { ThreadView } from "./thread-view";
import { PollSection } from "./poll-section";
import { sounds } from "@/lib/sounds";

interface ForumTabProps {
  subjectId: string;
}

export function ForumTab({ subjectId }: ForumTabProps) {
  const { session } = useSession();
  const { guard } = usePreviewGuard();
  const {
    threads,
    isLoading: threadsLoading,
    createThread,
    deleteThread,
    closeThread,
  } = useThreads(subjectId);
  const {
    polls,
    isLoading: pollsLoading,
    createPoll,
    votePoll,
    deletePoll,
  } = usePolls(subjectId);

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [showNewThread, setShowNewThread] = useState(false);

  const selectedThread = threads.find((t) => t.id === selectedThreadId) || null;

  const handleCreateThread = useCallback(
    async (data: {
      title: string;
      content: string;
      imageUrl?: string;
      mediaUrl?: string;
      attachments?: import("@/types").Attachment[];
    }) => {
      if (!guard("preview.forum_blocked")) return;
      await createThread(data);
      setShowNewThread(false);
    },
    [createThread]
  );

  const handleDeleteThread = useCallback(
    async (threadId: string) => {
      await deleteThread(threadId);
      setSelectedThreadId(null);
    },
    [deleteThread]
  );

  // If a thread is selected, show thread view
  if (selectedThread) {
    return (
      <ThreadView
        thread={selectedThread}
        onBack={() => setSelectedThreadId(null)}
        onDelete={handleDeleteThread}
        onClose={closeThread}
      />
    );
  }

  // Forum list view
  return (
    <div className="space-y-4 py-2">
      {/* Polls section */}
      {!pollsLoading && (
        <PollSection
          polls={polls}
          isAdmin={session?.isAdmin || false}
          onCreatePoll={createPoll}
          onVote={votePoll}
          onDelete={deletePoll}
        />
      )}

      {/* Thread form */}
      <AnimatePresence>
        {showNewThread && (
          <ThreadForm
            onSubmit={handleCreateThread}
            onCancel={() => setShowNewThread(false)}
          />
        )}
      </AnimatePresence>

      {/* Thread list */}
      <ThreadList
        threads={threads}
        isLoading={threadsLoading}
        onSelectThread={setSelectedThreadId}
        onNewThread={() => { sounds.toggle(); setShowNewThread(!showNewThread); }}
      />
    </div>
  );
}
