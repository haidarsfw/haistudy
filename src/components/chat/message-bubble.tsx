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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AudioPlayer } from "./audio-player";
import { springSmooth } from "@/lib/motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { PublicProfilePopover } from "@/components/user/public-profile-popover";
import type { ChatMessage } from "@/types";
import {
  ROLE_COLORS,
  resolveRole,
  getRoleNameClass,
  type UserRole,
} from "@/lib/role-colors";

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
  userRoleMap?: Map<string, UserRole>;
  avatarUrl?: string | null;
  // "dm" renders WhatsApp/IG-style bubbles: own right + accent, other left +
  // muted, no per-message avatar/name (the thread header already shows who).
  variant?: "default" | "dm";
  // True when the previous message is from the same sender - tightens spacing.
  grouped?: boolean;
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
  avatarUrl,
  variant = "default",
  grouped = false,
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

  const getMentionClasses = (mentionName: string) => {
    const name = mentionName.slice(1).toLowerCase();
    const role: UserRole = userRoleMap?.get(name) || "normal";
    const base = `font-semibold ${ROLE_COLORS[role].text}`;
    if (role === "diamond") {
      // Exclusive animated glow even for @mentions of diamond users.
      return "hs-diamond-glow";
    }
    if (role === "vip") {
      return `${base} drop-shadow-[0_0_6px_oklch(0.7_0.15_80/0.5)]`;
    }
    return base;
  };

  const authorRole = resolveRole({
    isAdmin: message.isAdmin,
    isTester: message.isTester,
    packageTier: message.packageTier ?? null,
  });

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

  // ─── DM bubble (WhatsApp/IG style) ───
  if (variant === "dm") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springSmooth}
        className={`group flex w-full px-3 ${grouped ? "mt-0.5" : "mt-2"} ${
          isOwn ? "justify-end" : "justify-start"
        }`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div
          className={`flex max-w-[82%] items-end gap-1 ${
            isOwn ? "flex-row-reverse" : "flex-row"
          }`}
        >
          <div
            className={`relative min-w-0 rounded-2xl px-3 py-2 text-sm leading-relaxed ${
              isOwn
                ? "rounded-br-md bg-primary text-primary-foreground"
                : "rounded-bl-md bg-muted text-foreground"
            } ${isPinned ? "ring-1 ring-primary/40" : ""}`}
          >
            {/* Reply preview */}
            {message.replyToId && message.replyToName && (
              <div
                className={`mb-1 flex items-center gap-1.5 rounded border-l-2 px-2 py-1 text-xs ${
                  isOwn
                    ? "border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground/80"
                    : "border-muted-foreground/30 bg-background/40 text-muted-foreground"
                }`}
              >
                <Reply className="h-3 w-3 shrink-0" />
                <span className="font-medium">{message.replyToName}</span>
                <span className="truncate">{message.replyToContent || "..."}</span>
              </div>
            )}

            {message.type === "text" && (
              <p className="whitespace-pre-wrap break-words">
                {renderContent(message.content)}
              </p>
            )}

            {message.type === "image" && message.mediaUrl && (
              <div>
                <button
                  onClick={() => onImageClick?.(message.mediaUrl!)}
                  className="block cursor-zoom-in"
                >
                  <img
                    src={message.mediaUrl}
                    alt="Shared image"
                    className="max-h-60 max-w-[240px] rounded-lg object-cover"
                    loading="lazy"
                  />
                </button>
                {message.content && (
                  <p className="mt-1 break-words">{renderContent(message.content)}</p>
                )}
              </div>
            )}

            {message.type === "audio" && message.mediaUrl && (
              <div className="mt-0.5">
                <AudioPlayer src={message.mediaUrl} />
              </div>
            )}

            {/* Time + pin */}
            <div
              className={`mt-0.5 flex items-center gap-1 text-[10px] ${
                isOwn
                  ? "justify-end text-primary-foreground/70"
                  : "text-muted-foreground"
              }`}
            >
              {isPinned && <Pin className="h-2.5 w-2.5" />}
              <span>{time}</span>
            </div>
          </div>

          {/* Actions */}
          <div
            className={`flex shrink-0 items-center gap-0.5 self-center transition-opacity ${
              showActions ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
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
                {(isAdmin || isOwn) && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(message.id)}
                    disabled={!isAdmin && !isOwn}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Hapus
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.div>
    );
  }

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
      {/* Avatar - clickable to preview the author's profile (self too) */}
      <PublicProfilePopover
        licenseKey={message.licenseKey}
        fallbackName={message.authorName}
        fallbackTier={message.packageTier}
        fallbackIsAdmin={message.isAdmin}
      >
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-pointer rounded-full transition-opacity hover:opacity-80"
        >
          <Avatar className="size-8">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={message.authorName} />}
            <AvatarFallback
              className={`text-xs font-medium ${
                message.isAdmin
                  ? "bg-primary/15 text-primary"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {message.authorName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
      </PublicProfilePopover>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Header */}
        <div className="flex items-center gap-2">
          <PublicProfilePopover
            licenseKey={message.licenseKey}
            fallbackName={message.authorName}
            fallbackTier={message.packageTier}
            fallbackIsAdmin={message.isAdmin}
          >
            <button
              type="button"
              className={`cursor-pointer text-sm font-semibold transition-opacity hover:opacity-80 hover:underline ${
                isOwn ? "text-primary" : ROLE_COLORS[authorRole].text
              } ${getRoleNameClass(authorRole)}`}
            >
              {message.authorName}
            </button>
          </PublicProfilePopover>
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
          {message.packageTier === "vip" && (
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
              {(isAdmin || isOwn) && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(message.id)}
                  disabled={!isAdmin && !isOwn}
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
