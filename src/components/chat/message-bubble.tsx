"use client";

import { useState } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import { motion } from "framer-motion";
import {
  Reply,
  Trash2,
  Pin,
  PinOff,
  MoreHorizontal,
  ShieldCheck,
  Crown,
  Gem,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioPlayer } from "./audio-player";
import { springSmooth } from "@/lib/motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { ChatMessage } from "@/types";

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  isAdmin: boolean;
  isPinned: boolean;
  onReply: (message: ChatMessage) => void;
  onDelete: (messageId: string) => void;
  onPin: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
  onImageClick?: (src: string) => void;
  userRoleMap?: Map<string, "admin" | "diamond" | "vip" | "tester" | "normal">;
}

export function MessageBubble({
  message,
  isOwn,
  isAdmin,
  isPinned,
  onReply,
  onDelete,
  onPin,
  onUnpin,
  onImageClick,
  userRoleMap,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);

  if (message.deleted) {
    return (
      <div className="flex justify-center py-1">
        <span className="text-xs italic text-muted-foreground">
          Pesan telah dihapus
        </span>
      </div>
    );
  }

  const time = format(new Date(message.createdAt), "HH:mm", {
    locale: idLocale,
  });

  // Render mention highlights with role-based colors
  const getMentionClasses = (mentionName: string) => {
    const name = mentionName.slice(1).toLowerCase(); // remove @ prefix
    const role = userRoleMap?.get(name);
    switch (role) {
      case "admin":
        return "font-semibold text-red-500 dark:text-red-400";
      case "diamond":
        return "font-semibold text-sky-500 dark:text-sky-400 drop-shadow-[0_0_6px_oklch(0.7_0.15_230/0.5)]";
      case "vip":
        return "font-semibold text-amber-500 dark:text-amber-300 drop-shadow-[0_0_6px_oklch(0.7_0.15_80/0.5)]";
      case "tester":
        return "font-semibold text-emerald-500 dark:text-emerald-400";
      case "normal":
        return "font-semibold text-blue-500 dark:text-blue-400";
      default:
        // @all or unknown — use blue
        if (name === "all") return "font-semibold text-blue-500 dark:text-blue-400";
        return "font-semibold text-blue-500 dark:text-blue-400";
    }
  };

  const renderContent = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) =>
      part.startsWith("@") ? (
        <span key={i} className={getMentionClasses(part)}>
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: isOwn ? 12 : -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={springSmooth}
      className={`group flex gap-2 px-3 py-1.5 transition-colors hover:bg-muted/30 ${
        isPinned ? "bg-primary/5 border-l-2 border-primary" : ""
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar placeholder */}
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
          message.isAdmin
            ? "bg-primary/15 text-primary"
            : "bg-secondary text-secondary-foreground"
        }`}
      >
        {message.authorName.charAt(0).toUpperCase()}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-semibold ${
              isOwn ? "text-primary" : "text-foreground"
            }`}
          >
            {message.authorName}
          </span>
          {message.isAdmin && (
            <Badge
              variant="admin-outline"
              className="h-4 gap-0.5 px-1 text-[9px]"
            >
              <ShieldCheck className="h-2.5 w-2.5" />
              Admin
            </Badge>
          )}
          {message.packageTier === "diamond" && (
            <Badge
              variant="diamond-outline"
              className="h-4 gap-0.5 px-1 text-[9px]"
            >
              <Gem className="h-2.5 w-2.5" />
              Diamond
            </Badge>
          )}
          {(message.packageTier === "vip" || message.packageTier === "diamond") && (
            <Badge
              variant="vip-outline"
              className="h-4 gap-0.5 px-1 text-[9px]"
            >
              <Crown className="h-2.5 w-2.5" />
              VIP
            </Badge>
          )}
          {message.isTester && (
            <Badge
              variant="tester-outline"
              className="h-4 gap-0.5 px-1 text-[9px]"
            >
              Tester
            </Badge>
          )}
          {message.authorClass && (
            <span className="text-[10px] text-muted-foreground">
              {message.authorClass}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">{time}</span>
          {isPinned && (
            <Pin className="h-3 w-3 text-primary" />
          )}
        </div>

        {/* Reply preview */}
        {message.replyToId && message.replyToName && (
          <div className="mt-0.5 flex items-center gap-1.5 rounded border-l-2 border-muted-foreground/30 bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
            <Reply className="h-3 w-3 shrink-0" />
            <span className="font-medium">{message.replyToName}</span>
            <span className="truncate">
              {message.replyToContent || "..."}
            </span>
          </div>
        )}

        {/* Message body */}
        {message.type === "text" && (
          <p className="mt-0.5 text-sm leading-relaxed break-words">
            {renderContent(message.content)}
          </p>
        )}

        {message.type === "image" && message.mediaUrl && (
          <div className="mt-1">
            <button
              onClick={() => onImageClick?.(message.mediaUrl!)}
              className="block cursor-zoom-in"
            >
              <img
                src={message.mediaUrl}
                alt="Shared image"
                className="max-h-60 max-w-[280px] rounded-lg border border-border object-cover"
                loading="lazy"
              />
            </button>
            {message.content && (
              <p className="mt-1 text-sm">{renderContent(message.content)}</p>
            )}
          </div>
        )}

        {message.type === "audio" && message.mediaUrl && (
          <div className="mt-1">
            <AudioPlayer src={message.mediaUrl} />
          </div>
        )}
      </div>

      {/* Actions - always rendered, visibility toggled to prevent layout shift */}
      <div className={`flex shrink-0 items-start gap-0.5 pt-0.5 transition-opacity ${showActions ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onReply(message)}
          >
            <Reply className="h-3.5 w-3.5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" className="h-6 w-6" />}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {isAdmin && (
                <DropdownMenuItem
                  onClick={() =>
                    isPinned ? onUnpin(message.id) : onPin(message.id)
                  }
                >
                  {isPinned ? (
                    <>
                      <PinOff className="mr-2 h-3.5 w-3.5" />
                      Unpin
                    </>
                  ) : (
                    <>
                      <Pin className="mr-2 h-3.5 w-3.5" />
                      Pin
                    </>
                  )}
                </DropdownMenuItem>
              )}
              {(isOwn || isAdmin) && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(message.id)}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Hapus
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
    </motion.div>
  );
}
