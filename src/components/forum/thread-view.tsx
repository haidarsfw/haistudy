"use client";

import { useState, useMemo } from "react";
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
  Crown,
  Gem,
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
import { detectMediaType } from "@/lib/media-utils";
import type { ForumThread, Attachment } from "@/types";
import { ROLE_COLORS, resolveRole } from "@/lib/role-colors";

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
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "iframe">("image");
  const { t } = useTranslation();
  const isAdmin = session?.isAdmin || false;
  const isAuthor = deviceId === thread.authorId;

  // Build merged attachments: prefer new attachments, fall back to legacy fields
  const attachments = useMemo<Attachment[]>(() => {
    if (thread.attachments && thread.attachments.length > 0) {
      return thread.attachments;
    }
    const legacy: Attachment[] = [];
    if (thread.imageUrl) {
      legacy.push({ type: "image", url: thread.imageUrl });
    }
    if (thread.mediaUrl) {
      const mt = detectMediaType(thread.mediaUrl);
      const type = mt === "youtube" ? "youtube"
        : mt === "google-slides" ? "google-slides"
        : mt === "google-pdf" ? "google-pdf"
        : "link";
      legacy.push({ type, url: thread.mediaUrl });
    }
    return legacy;
  }, [thread.attachments, thread.imageUrl, thread.mediaUrl]);

  const handleExpand = (url: string, type: "image" | "iframe") => {
    setPreviewSrc(url);
    setPreviewType(type);
  };

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
          <span
            className={`text-sm font-semibold ${
              ROLE_COLORS[
                resolveRole({
                  isAdmin: thread.isAdmin,
                  isTester: thread.isTester,
                  packageTier: thread.packageTier ?? null,
                })
              ].text
            }`}
          >
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
          {thread.packageTier === "diamond" && (
            <Badge variant="diamond-outline" className="gap-0.5 text-[10px] px-1.5 py-0">
              <Gem className="h-2.5 w-2.5" />
              Diamond
            </Badge>
          )}
          {(thread.packageTier === "vip" || thread.packageTier === "diamond") && (
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
        </div>

        {/* Content */}
        {thread.content && (
          <div className="mt-3 text-sm">{parseForumContent(thread.content)}</div>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="mt-3 space-y-3">
            {/* Image gallery */}
            {attachments.filter((a) => a.type === "image").length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments
                  .filter((a) => a.type === "image")
                  .map((a, i) => (
                    <Image
                      key={`img-${i}`}
                      src={a.url}
                      alt={`Attachment ${i + 1}`}
                      width={300}
                      height={200}
                      className="max-h-60 w-auto rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      unoptimized
                      onClick={() => handleExpand(a.url, "image")}
                    />
                  ))}
              </div>
            )}

            {/* Media embeds (YouTube, Slides, PDF, Links) */}
            {attachments
              .filter((a) => a.type !== "image")
              .map((a, i) => (
                <MediaEmbed
                  key={`media-${i}`}
                  url={a.url}
                  onExpand={handleExpand}
                />
              ))}
          </div>
        )}

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
                onImageClick={(url) => handleExpand(url, "image")}
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
      <MediaPreviewer
        src={previewSrc}
        type={previewType}
        onClose={() => setPreviewSrc(null)}
      />
    </motion.div>
  );
}
