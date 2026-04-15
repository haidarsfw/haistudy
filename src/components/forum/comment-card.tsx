"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Reply, Trash2, Shield, Crown, Gem } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CommentInput } from "./comment-input";
import { parseForumContent } from "@/lib/content-parser";
import type { ForumComment } from "@/types";
import { ROLE_COLORS, resolveRole } from "@/lib/role-colors";

interface CommentCardProps {
  comment: ForumComment;
  currentUserId: string;
  isAdmin: boolean;
  threadClosed: boolean;
  onReply: (content: string, parentCommentId: string, imageUrl?: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onImageClick?: (url: string) => void;
  isReply?: boolean;
}

export function CommentCard({
  comment,
  currentUserId,
  isAdmin,
  threadClosed,
  onReply,
  onDelete,
  onImageClick,
  isReply = false,
}: CommentCardProps) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const canDelete = comment.authorId === currentUserId || isAdmin;
  const canReply = !threadClosed && !isReply;

  const handleReply = async (content: string, imageUrl?: string) => {
    await onReply(content, comment.id, imageUrl);
    setShowReplyInput(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`${isReply ? "ml-8 border-l-2 border-border pl-4" : ""}`}
    >
      <div className="py-3">
        {/* Author info */}
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-semibold ${
              ROLE_COLORS[
                resolveRole({
                  isAdmin: comment.isAdmin,
                  isTester: comment.isTester,
                  packageTier: comment.packageTier ?? null,
                })
              ].text
            }`}
          >
            {comment.authorName}
          </span>
          {comment.authorClass && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {comment.authorClass}
            </Badge>
          )}
          {comment.isAdmin && (
            <Badge variant="admin-outline" className="gap-0.5 text-[10px] px-1.5 py-0">
              <Shield className="h-2.5 w-2.5" />
              Admin
            </Badge>
          )}
          {comment.packageTier === "diamond" && (
            <Badge variant="diamond-outline" className="gap-0.5 text-[10px] px-1.5 py-0">
              <Gem className="h-2.5 w-2.5" />
              Diamond
            </Badge>
          )}
          {(comment.packageTier === "vip" || comment.packageTier === "diamond") && (
            <Badge variant="vip-outline" className="gap-0.5 text-[10px] px-1.5 py-0">
              <Crown className="h-2.5 w-2.5" />
              VIP
            </Badge>
          )}
          {comment.isTester && (
            <Badge variant="tester-outline" className="text-[10px] px-1.5 py-0">
              Tester
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.createdAt), {
              addSuffix: true,
              locale: idLocale,
            })}
          </span>
        </div>

        {/* Content */}
        {comment.content && (
          <div className="mt-1 text-sm">{parseForumContent(comment.content)}</div>
        )}
        {comment.imageUrl && (
          <Image
            src={comment.imageUrl}
            alt="Comment image"
            width={300}
            height={200}
            className="mt-2 max-h-48 w-auto rounded-lg object-cover cursor-pointer"
            unoptimized
            onClick={() => onImageClick?.(comment.imageUrl!)}
          />
        )}

        {/* Actions */}
        <div className="mt-1.5 flex items-center gap-1">
          {canReply && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground"
              onClick={() => setShowReplyInput(!showReplyInput)}
            >
              <Reply className="h-3 w-3" />
              Balas
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
              onClick={() => onDelete(comment.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Inline reply input */}
        {showReplyInput && (
          <div className="mt-2 ml-2">
            <CommentInput
              placeholder={`Balas ${comment.authorName}...`}
              onSubmit={handleReply}
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-0">
          {comment.replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              threadClosed={threadClosed}
              onReply={onReply}
              onDelete={onDelete}
              onImageClick={onImageClick}
              isReply
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
