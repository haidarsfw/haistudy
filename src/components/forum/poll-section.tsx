"use client";

import { useState } from "react";
import { BarChart3, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { usePreviewGuard } from "@/hooks/use-preview-guard";
import { PollWidget } from "./poll-widget";
import { PollForm } from "./poll-form";
import type { ForumPoll } from "@/types";

interface PollSectionProps {
  polls: ForumPoll[];
  isAdmin: boolean;
  onCreatePoll: (question: string, options: string[]) => Promise<void>;
  onVote: (pollId: string, optionIndex: number) => Promise<void>;
  onDelete: (pollId: string) => Promise<void>;
}

export function PollSection({
  polls,
  isAdmin,
  onCreatePoll,
  onVote,
  onDelete,
}: PollSectionProps) {
  const { guard } = usePreviewGuard();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(polls.length <= 2);

  const handleCreate = async (question: string, options: string[]) => {
    await onCreatePoll(question, options);
    setShowForm(false);
  };

  if (polls.length === 0 && !showForm) {
    return (
      <div className="py-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          onClick={() => { if (!guard("preview.forum_blocked")) return; setShowForm(true); }}
        >
          <BarChart3 className="h-4 w-4" />
          Buat Poll
        </Button>
      </div>
    );
  }

  const visiblePolls = expanded ? polls : polls.slice(0, 2);

  return (
    <div className="space-y-3 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <BarChart3 className="h-4 w-4" />
          Polls ({polls.length})
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-xs"
          onClick={() => { if (!showForm && !guard("preview.forum_blocked")) return; setShowForm(!showForm); }}
        >
          <Plus className="h-3.5 w-3.5" />
          Buat
        </Button>
      </div>

      {/* Poll form */}
      <AnimatePresence>
        {showForm && (
          <PollForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        )}
      </AnimatePresence>

      {/* Poll list */}
      <div className="space-y-3">
        {visiblePolls.map((poll) => (
          <PollWidget
            key={poll.id}
            poll={poll}
            isAdmin={isAdmin}
            onVote={onVote}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Show more/less */}
      {polls.length > 2 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full gap-1 text-xs text-muted-foreground"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Tampilkan lebih sedikit
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Tampilkan semua ({polls.length})
            </>
          )}
        </Button>
      )}
    </div>
  );
}
