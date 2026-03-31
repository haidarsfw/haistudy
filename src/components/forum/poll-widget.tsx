"use client";

import { Trash2, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useTranslation } from "@/components/providers/language-provider";
import { usePreviewGuard } from "@/hooks/use-preview-guard";
import type { ForumPoll } from "@/types";
import { sounds } from "@/lib/sounds";

interface PollWidgetProps {
  poll: ForumPoll;
  isAdmin: boolean;
  onVote: (pollId: string, optionIndex: number) => Promise<void>;
  onDelete: (pollId: string) => Promise<void>;
}

export function PollWidget({ poll, isAdmin, onVote, onDelete }: PollWidgetProps) {
  const { t } = useTranslation();
  const { guard } = usePreviewGuard();
  const hasVoted = poll.userVote !== null && poll.userVote !== undefined;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Question */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold">{poll.question}</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            oleh {poll.authorName} &middot;{" "}
            {formatDistanceToNow(new Date(poll.createdAt), {
              addSuffix: true,
              locale: idLocale,
            })}
          </p>
        </div>
        {isAdmin && (
          <ConfirmDialog
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            }
            description={t("confirm.delete_poll")}
            onConfirm={() => onDelete(poll.id)}
          />
        )}
      </div>

      {/* Options */}
      <div className="mt-3 space-y-2">
        {poll.options.map((option, index) => {
          const percentage =
            poll.totalVotes > 0
              ? Math.round((option.votes / poll.totalVotes) * 100)
              : 0;
          const isUserChoice = poll.userVote === index;

          if (hasVoted) {
            // Show results
            return (
              <div key={index} className="relative overflow-hidden rounded-lg">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`absolute inset-y-0 left-0 ${
                    isUserChoice ? "bg-primary/15" : "bg-muted/50"
                  }`}
                />
                <div className="relative flex items-center justify-between px-3 py-2">
                  <span className="flex items-center gap-1.5 text-sm">
                    {isUserChoice && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    )}
                    {option.text}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {percentage}% ({option.votes})
                  </span>
                </div>
              </div>
            );
          }

          // Voting buttons
          return (
            <button
              key={index}
              onClick={() => { if (!guard("preview.forum_blocked")) return; sounds.click(); onVote(poll.id, index); }}
              className="w-full rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
            >
              {option.text}
            </button>
          );
        })}
      </div>

      {/* Total votes */}
      <p className="mt-2 text-xs text-muted-foreground">
        {poll.totalVotes} suara
        {hasVoted && " · Kamu sudah memilih"}
      </p>
    </div>
  );
}
