"use client";

import { useState } from "react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  ArrowLeft,
  Lock,
  Unlock,
  Trash2,
  Shield,
  MessageSquare,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { MediaPreviewer } from "@/components/shared/media-previewer";
import { useTranslation } from "@/components/providers/language-provider";
import { useSession } from "@/components/providers/session-provider";
import { useComments } from "@/hooks/use-comments";
import { getDeviceId } from "@/lib/auth/device";
import { CommentInput } from "./comment-input";
import { CommentCard } from "./comment-card";
import { MediaEmbed } from "./media-embed";
import { parseForumContent } from "@/lib/content-parser";
import type { ForumThread } from "@/types";

interface ThreadViewProps {
  thread: ForumThread;
  onBack: () => void;
  onDelete: (threadId: string) => Promise<void>;
  onClose: (threadId: string, closed: boolean) => Promise<void>;
}

export function ThreadView({
  thread,
  onBack,
  onDelete,
  onClose,
}: ThreadViewProps) {
  const { session } = useSession();
  const { comments, isLoading, addComment, deleteComment } = useComments(
    thread.id
  );
  const [deviceId] = useState(() => getDeviceId());
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { t } = useTranslation();
  const isAdmin = session?.isAdmin || false;
  const isAuthor = deviceId === thread.authorId;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="py-4"
    >
      {/* Header with back button */}
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">Kembali ke forum</span>
      </div>

      {/* Thread content */}
      <div className="rounded-xl border border-border bg-card p-4">
        {/* Title */}
        <h2 className="font-heading text-base font-bold leading-snug">
          {thread.closed && (
            <Lock className="mr-1.5 inline h-4 w-4 text-muted-foreground" />
          )}
          {thread.title}
        </h2>

        {/* Author info */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{thread.authorName}</span>
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
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(thread.createdAt), {
              addSuffix: true,
              locale: idLocale,
            })}
          </span>
        </div>

        {/* Content */}
        {thread.content && (
          <div className="mt-3 text-sm">{parseForumContent(thread.content)}</div>
        )}

        {/* Image */}
        {thread.imageUrl && (
          <Image
            src={thread.imageUrl}
            alt="Thread image"
            width={600}
            height={320}
            className="mt-3 max-h-80 w-auto rounded-lg object-contain cursor-pointer"
            unoptimized
            onClick={() => setPreviewImage(thread.imageUrl!)}
          />
        )}

        {/* Media embed */}
        {thread.mediaUrl && <MediaEmbed url={thread.mediaUrl} />}

        {/* Admin / author actions */}
        {(isAdmin || isAuthor) && (
          <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => onClose(thread.id, !thread.closed)}
              >
                {thread.closed ? (
                  <Unlock className="h-3.5 w-3.5" />
                ) : (
                  <Lock className="h-3.5 w-3.5" />
                )}
                {thread.closed ? "Buka Thread" : "Tutup Thread"}
              </Button>
            )}
            {(isAdmin || isAuthor) && (
              <ConfirmDialog
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("common.delete")}
                  </Button>
                }
                description={t("confirm.delete_thread")}
                onConfirm={async () => {
                  await onDelete(thread.id);
                  onBack();
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Closed notice */}
      {thread.closed && (
        <div className="mt-4 rounded-lg border border-border bg-muted/50 px-4 py-3 text-center text-sm text-muted-foreground">
          <Lock className="mr-1.5 inline h-3.5 w-3.5" />
          Thread ini sudah ditutup. Tidak bisa menambah komentar baru.
        </div>
      )}

      {/* Comments section */}
      <div className="mt-6">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <MessageSquare className="h-4 w-4" />
          Komentar ({thread.commentCount})
        </h3>

        {isLoading ? (
          <div className="space-y-3 py-4">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse space-y-2 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-20 rounded bg-muted" />
                  <div className="h-3 w-12 rounded bg-muted" />
                </div>
                <div className="h-4 w-3/4 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Belum ada komentar.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {comments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                currentUserId={deviceId}
                isAdmin={isAdmin}
                threadClosed={thread.closed}
                onReply={addComment}
                onDelete={deleteComment}
                onImageClick={setPreviewImage}
              />
            ))}
          </div>
        )}

        {/* Comment input */}
        {!thread.closed && session && (
          <div className="mt-4">
            <CommentInput
              placeholder="Tulis komentar..."
              onSubmit={(content, imageUrl) => addComment(content, undefined, imageUrl)}
            />
          </div>
        )}
      </div>
      <MediaPreviewer src={previewImage} onClose={() => setPreviewImage(null)} />
    </motion.div>
  );
}
