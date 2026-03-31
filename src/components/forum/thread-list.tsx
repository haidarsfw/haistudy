"use client";

import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { MessageSquare, Lock, Shield, Crown, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ForumThread } from "@/types";
import { springSmooth } from "@/lib/motion";

interface ThreadListProps {
  threads: ForumThread[];
  isLoading: boolean;
  onSelectThread: (threadId: string) => void;
  onNewThread: () => void;
}

function ThreadSkeleton() {
  return (
    <div className="animate-pulse space-y-2 rounded-xl border border-border p-4">
      <div className="h-4 w-3/4 rounded bg-muted" />
      <div className="flex items-center gap-2">
        <div className="h-3 w-20 rounded bg-muted" />
        <div className="h-3 w-16 rounded bg-muted" />
      </div>
    </div>
  );
}

export function ThreadList({
  threads,
  isLoading,
  onSelectThread,
  onNewThread,
}: ThreadListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        <ThreadSkeleton />
        <ThreadSkeleton />
        <ThreadSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-3 py-4">
      <Button
        size="sm"
        className="w-full gap-1.5"
        onClick={onNewThread}
      >
        <Plus className="h-4 w-4" />
        Buat Thread
      </Button>

      {threads.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Belum ada diskusi. Mulai thread pertama!
          </p>
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {threads.map((thread) => (
            <motion.button
              key={thread.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={springSmooth}
              onClick={() => onSelectThread(thread.id)}
              className="flex w-full flex-col gap-1.5 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent/5"
            >
              <div className="flex items-start gap-2">
                <h3 className="flex-1 text-sm font-semibold leading-snug">
                  {thread.closed && (
                    <Lock className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  {thread.title}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {thread.authorName}
                </span>
                {thread.authorClass && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {thread.authorClass}
                  </Badge>
                )}
                {thread.isAdmin && (
                  <Badge variant="admin-outline" className="gap-0.5 text-[10px] px-1.5 py-0">
                    <Shield className="h-2.5 w-2.5" />
                    Admin
                  </Badge>
                )}
                {thread.packageTier === "vip" && (
                  <Badge variant="vip-outline" className="gap-0.5 text-[10px] px-1.5 py-0">
                    <Crown className="h-2.5 w-2.5" />
                    VIP
                  </Badge>
                )}
                {thread.isTester && (
                  <Badge variant="tester-outline" className="text-[10px] px-1.5 py-0">
                    Tester
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(thread.createdAt), {
                    addSuffix: true,
                    locale: idLocale,
                  })}
                </span>
                <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageSquare className="h-3 w-3" />
                  {thread.commentCount}
                </span>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}
