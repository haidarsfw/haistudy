"use client";

import { useState, useMemo } from "react";
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
  CheckCheck,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AudioPlayer } from "./audio-player";
import { springSmooth } from "@/lib/motion";
import { useSession } from "@/components/providers/session-provider";
import { useVoice } from "@/components/providers/voice-provider";
import { canUseVipFeatures } from "@/lib/tier";
import { toast } from "@/components/ui/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { PublicProfilePopover } from "@/components/user/public-profile-popover";
import type { ChatMessage, VoiceRoom } from "@/types";
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
  // DM read receipt (own messages only): grey ticks = sent, blue = read.
  dmReadState?: "sent" | "read";
  // When read, the other participant's read time (shown on hover/tap).
  dmReadAt?: string | null;
  onReplyQuoteClick?: (messageId: string) => void;
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
  dmReadState,
  dmReadAt,
  onReplyQuoteClick,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const { session } = useSession();
  const { rooms: voiceRooms, joinRoom, leaveRoom, activeRoom } = useVoice();

  // Sort room names by length descending so longer room names match first
  const roomNames = useMemo(() => {
    return (voiceRooms || []).map((r) => r.name).sort((a, b) => b.length - a.length);
  }, [voiceRooms]);

  const splitRegex = useMemo(() => {
    if (roomNames.length === 0) {
      return /(\b(?:https?:\/\/|www\.)[^\s<>{}|\\^`]+[^\s<>{}|\\^`.,!?;:\'"]|@\w+)/gi;
    }
    const escapedNames = roomNames
      .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");
    return new RegExp(
      `(\\b(?:https?:\/\/|www\\.)[^\\s<>{}|\\\\^\`]+[^\\s<>{}|\\\\^\`.,!?;:\\'"]|@\\w+|#(?:${escapedNames}))`,
      "gi"
    );
  }, [roomNames]);

  const quotedRooms = useMemo(() => {
    if (!message.content || message.deleted || !voiceRooms || voiceRooms.length === 0) return [];
    
    return voiceRooms.filter(room => {
      const escapedName = room.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`#${escapedName}\\b`, "i");
      return regex.test(message.content);
    });
  }, [message.content, message.deleted, voiceRooms]);

  const renderVoiceRoomCards = (rooms: VoiceRoom[]) => {
    if (rooms.length === 0) return null;

    return (
      <div className="mt-2.5 space-y-2">
        {rooms.map((room) => {
          const isVipRoom = room.name.toLowerCase().includes("vip");
          const isVipUser = canUseVipFeatures(session);
          const isLocked = isVipRoom && !isVipUser;
          const isActive = activeRoom?.id === room.id;
          const participantCount = room.participants?.length || 0;

          // Adaptive colors based on message sender (isOwn) and theme variables (no hardcoded dark values)
          const cardBg = isOwn
            ? "bg-white/10 border-white/20 text-white shadow-sm"
            : "bg-background/65 dark:bg-background/40 border border-border/50 text-foreground shadow-sm";
          
          const countBg = isOwn
            ? "bg-white/20 text-white"
            : "bg-muted text-muted-foreground border border-border/20";
          
          const titleColor = isOwn
            ? "text-white"
            : "text-foreground";
          
          const subtitleColor = isOwn
            ? "text-white/70"
            : "text-muted-foreground";

          const iconColor = isOwn
            ? "text-white/80"
            : "text-muted-foreground/80 dark:text-muted-foreground/90";

          return (
            <div key={room.id} className="w-full max-w-[340px] md:max-w-[380px] select-none text-left font-sans">
              {/* Card Body */}
              <div className={`flex items-center justify-between rounded-xl border p-2.5 shadow-sm transition-all duration-200 ${cardBg}`}>
                {/* Left/Middle Column info */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                  {/* Participant count box */}
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${countBg}`}>
                    {participantCount}
                  </div>
                  
                  {/* Channel details */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                      <Volume2 className={`h-3.5 w-3.5 shrink-0 ${iconColor}`} />
                      <span className={`text-xs font-bold truncate ${titleColor}`}>
                        {room.name}
                        {isVipRoom && (
                          <span className="ml-1 text-[9px] text-amber-500 font-bold shrink-0">
                            🔒 VIP
                          </span>
                        )}
                      </span>
                    </div>
                    <span className={`text-[10px] truncate ${subtitleColor}`}>
                      in haistudy
                    </span>
                  </div>
                </div>

                {/* Right button */}
                <button
                  type="button"
                  onClick={() => {
                    if (isLocked) {
                      toast.error("Hanya anggota VIP yang dapat mengakses room VIP!");
                      return;
                    }
                    if (isActive) {
                      leaveRoom();
                      toast.success(`Meninggalkan voice room: ${room.name}`);
                      return;
                    }
                    joinRoom(room.id);
                    toast.success(`Bergabung ke voice room: ${room.name}`);
                  }}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold transition-all shrink-0 select-none cursor-pointer active:scale-95 ${
                    isActive
                      ? isOwn
                        ? "bg-white/20 hover:bg-white/30 text-white"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                      : isLocked
                        ? isOwn
                          ? "bg-white/10 text-white/50 cursor-not-allowed active:scale-100"
                          : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed active:scale-100"
                        : isOwn
                          ? "bg-white text-primary hover:bg-white/95"
                          : "bg-primary text-primary-foreground hover:bg-primary/95"
                  }`}
                >
                  {isActive ? "Joined" : "Join"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

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
    const parts = text.split(splitRegex);
    return parts.map((part, i) => {
      if (!part) return null;
      if (part.startsWith("@")) {
        return (
          <span key={i} className={getMentionClasses(part)}>
            {part}
          </span>
        );
      }
      if (part.startsWith("#")) {
        const roomName = part.slice(1);
        const room = voiceRooms.find((r) => r.name.toLowerCase() === roomName.toLowerCase());
        if (room) {
          return null;
        }
      }
      if (/^(?:https?:\/\/|www\.)/i.test(part)) {
        const href = part.startsWith("www.") ? `https://${part}` : part;
        return (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2 break-all font-medium"
          >
            {part}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  // ─── DM bubble (WhatsApp/IG style) ───
  if (variant === "dm") {
    return (
      <motion.div
        data-message-id={message.id}
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
              <button
                type="button"
                onClick={() => onReplyQuoteClick?.(message.replyToId!)}
                className={`mb-1 flex w-full text-left items-center gap-1.5 rounded border-l-2 px-2 py-1 text-xs transition-colors hover:bg-white/10 ${
                  isOwn
                    ? "border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground/80"
                    : "border-muted-foreground/30 bg-background/40 text-muted-foreground"
                }`}
              >
                <Reply className="h-3 w-3 shrink-0" />
                <span className="font-medium">{message.replyToName}</span>
                <span className="truncate">{message.replyToContent || "..."}</span>
              </button>
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

            {quotedRooms.length > 0 && renderVoiceRoomCards(quotedRooms)}

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
              {isOwn && dmReadState && (
                <span
                  className="inline-flex"
                  aria-label={dmReadState === "read" ? "Dibaca" : "Terkirim"}
                  title={
                    dmReadState === "read" && dmReadAt
                      ? `Dibaca ${format(new Date(dmReadAt), "HH:mm", { locale: idLocale })}`
                      : "Terkirim"
                  }
                >
                  <CheckCheck
                    className={`h-3 w-3 ${
                      dmReadState === "read"
                        ? "text-sky-300"
                        : "text-primary-foreground/50"
                    }`}
                  />
                </span>
              )}
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
      data-message-id={message.id}
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
          <button
            type="button"
            onClick={() => onReplyQuoteClick?.(message.replyToId!)}
            className="mt-0.5 flex w-full text-left items-center gap-1.5 rounded border-l-2 border-muted-foreground/30 bg-muted/40 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/60"
          >
            <Reply className="h-3 w-3 shrink-0" />
            <span className="font-medium">{message.replyToName}</span>
            <span className="truncate">
              {message.replyToContent || "..."}
            </span>
          </button>
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

        {quotedRooms.length > 0 && renderVoiceRoomCards(quotedRooms)}
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
