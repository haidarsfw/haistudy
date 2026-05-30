"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Reply,
  Smile,
  Pencil,
  MoreHorizontal,
  RotateCw,
  Trash2,
  Copy as CopyIcon,
  Check as CheckIcon,
  Pin,
  PinOff,
  Info,
  EyeOff,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/components/providers/language-provider";
import { useLongPress } from "@/hooks/use-long-press";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  ROLE_COLORS,
  resolveRole,
} from "@/lib/role-colors";
import { SUPPORT_EDIT_WINDOW_MS } from "@/lib/constants";
import type {
  SupportMessage,
  SupportReaction,
  SupportReadReceipt,
  SupportReaderKind,
} from "@/types";
import { SupportMessageContent } from "./support-message-content";
import { SupportReplyQuote } from "./support-reply-quote";
import { SupportReactionsBar } from "./support-reactions-bar";
import { SupportEmojiPopover } from "./support-emoji-popover";
import { SupportReadReceipt as ReadReceiptIcon } from "./support-read-receipt";
import { SupportSwipeReplyWrapper } from "./support-swipe-reply-wrapper";

interface AuthorMeta {
  isTester?: boolean;
  packageTier?: "share" | "normal" | "vip" | "diamond" | null;
}

interface Props {
  message: SupportMessage;
  /** True when this bubble was authored by current viewer. */
  isOwn: boolean;
  /** Author metadata for role coloring (resolved from license_keys table for the user). */
  authorMeta?: AuthorMeta;
  reactions: SupportReaction[];
  receipts: SupportReadReceipt[];
  myKey: string | null;
  myKind: SupportReaderKind;
  /** Show author name above the bubble (false for grouped consecutive messages). */
  showSender: boolean;
  onReply: (msg: SupportMessage) => void;
  onEdit: (msg: SupportMessage) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  isReactionInflight: (messageId: string, emoji: string) => boolean;
  onImageClick?: (url: string) => void;
  onReplyQuoteClick?: (replyToId: string) => void;
  /** Whether the message that this is replying to still exists. */
  replyExists?: boolean;
  /** Re-send if status='error'. */
  onRetry?: () => void;
  onRemoveFailed?: () => void;
  /** Highlight target - temporarily ring the bubble (set by parent for 1s). */
  highlight?: boolean;
  /** Admin-only unsend. Provided when myKind='admin'. */
  onUnsend?: (msg: SupportMessage) => void;
  /** Hide locally for current user (own message only). */
  onHideForMe?: (id: string) => void;
  /** Admin pin/unpin. */
  onPin?: (id: string) => void;
  onUnpin?: (id: string) => void;
  isPinned?: boolean;
  /** Whether current pin count has reached the cap (disable Pin action). */
  pinCapReached?: boolean;
  /** Open the Info modal (long-press / receipt click). */
  onOpenInfo?: (msg: SupportMessage) => void;
}

export function SupportMessageBubble({
  message,
  isOwn,
  authorMeta,
  reactions,
  receipts,
  myKey,
  myKind,
  showSender,
  onReply,
  onEdit,
  onToggleReaction,
  isReactionInflight,
  onImageClick,
  onReplyQuoteClick,
  replyExists = true,
  onUnsend,
  onHideForMe,
  onPin,
  onUnpin,
  isPinned,
  pinCapReached,
  onOpenInfo,
  onRetry,
  onRemoveFailed,
  highlight,
}: Props) {
  const { t } = useTranslation();
  const [showReactPopover, setShowReactPopover] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const bubbleRef = useRef<HTMLDivElement>(null);
  const { copied, copy } = useCopyToClipboard();
  const reducedMotion = useReducedMotion();

  // Tick once per minute so canEdit transitions cleanly from true→false at 15min
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Edit eligibility: own + text + within window
  const ageMs = now - new Date(message.createdAt).getTime();
  const canEdit =
    isOwn &&
    !message.isSystem &&
    !message.deleted &&
    message.type === "text" &&
    ageMs < SUPPORT_EDIT_WINDOW_MS;

  // Read receipt: own message → was OTHER side's receipt recorded?
  const otherReceipt = receipts.find((r) =>
    isOwn ? r.readerKind !== myKind : false
  );
  const isRead = Boolean(otherReceipt);
  const readAt = otherReceipt?.readAt ?? null;
  const readerKind = otherReceipt?.readerKind ?? null;

  // Author role for name color (use sender's license metadata)
  const authorRole = resolveRole({
    isAdmin: message.isAdmin,
    isTester: authorMeta?.isTester ?? false,
    packageTier: authorMeta?.packageTier ?? null,
  });

  // Long-press → open full action menu (mobile primary entry).
  const longPress = useLongPress(() => setMenuOpen(true), { delay: 450 });

  // Close popover when clicking outside.
  useEffect(() => {
    if (!showReactPopover) return;
    const onDoc = (e: PointerEvent) => {
      const target = e.target as Node;
      if (bubbleRef.current && !bubbleRef.current.contains(target)) {
        setShowReactPopover(false);
      }
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [showReactPopover]);

  const handleReplyQuoteClick = useCallback(() => {
    if (message.replyToId && replyExists) {
      onReplyQuoteClick?.(message.replyToId);
    }
  }, [message.replyToId, replyExists, onReplyQuoteClick]);

  const handleReplyAction = useCallback(() => {
    onReply(message);
  }, [onReply, message]);

  // System messages render centered, no actions
  if (message.isSystem || message.type === "system") {
    return (
      <div className="flex justify-center py-1">
        <SupportMessageContent message={message} />
      </div>
    );
  }

  // Shared menu items rendered both inside the controlled menu (long-press / desktop ⋯)
  const menuItems = (
    <>
      <DropdownMenuItem onClick={handleReplyAction}>
        <Reply className="mr-2 h-3.5 w-3.5" />
        {t("support.reply")}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setShowReactPopover(true)}>
        <Smile className="mr-2 h-3.5 w-3.5" />
        {t("support.add_reaction")}
      </DropdownMenuItem>
      {message.type === "text" && message.content && (
        <DropdownMenuItem onClick={() => copy(message.content)}>
          {copied ? (
            <CheckIcon className="mr-2 h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <CopyIcon className="mr-2 h-3.5 w-3.5" />
          )}
          {copied ? t("support.copied") : t("support.copy")}
        </DropdownMenuItem>
      )}
      {canEdit && (
        <DropdownMenuItem onClick={() => onEdit(message)}>
          <Pencil className="mr-2 h-3.5 w-3.5" />
          {t("support.edit")}
        </DropdownMenuItem>
      )}
      {isOwn && onOpenInfo && (
        <DropdownMenuItem onClick={() => onOpenInfo(message)}>
          <Info className="mr-2 h-3.5 w-3.5" />
          {t("support.message_info")}
        </DropdownMenuItem>
      )}
      {myKind === "admin" &&
        onPin &&
        onUnpin &&
        !message.isInternal &&
        !message.deleted && (
          <DropdownMenuItem
            onClick={() =>
              isPinned ? onUnpin(message.id) : onPin(message.id)
            }
            disabled={!isPinned && pinCapReached}
          >
            {isPinned ? (
              <>
                <PinOff className="mr-2 h-3.5 w-3.5" />
                {t("support.unpin_message")}
              </>
            ) : (
              <>
                <Pin className="mr-2 h-3.5 w-3.5" />
                {t("support.pin_message")}
              </>
            )}
          </DropdownMenuItem>
        )}
      {isOwn && onHideForMe && (
        <DropdownMenuItem
          onClick={() => onHideForMe(message.id)}
          className="text-amber-600 focus:text-amber-600"
        >
          <EyeOff className="mr-2 h-3.5 w-3.5" />
          {t("support.hide_for_me")}
        </DropdownMenuItem>
      )}
      {myKind === "admin" &&
        onUnsend &&
        !message.deleted &&
        !message.isSystem && (
          <DropdownMenuItem
            onClick={() => onUnsend(message)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            {t("support.unsend_for_everyone")}
          </DropdownMenuItem>
        )}
    </>
  );

  return (
    <SupportSwipeReplyWrapper onReply={handleReplyAction} disabled={message.isSystem}>
      <motion.div
        layout
        initial={reducedMotion ? false : { opacity: 0, y: 6 }}
        animate={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0.04 : 0.18 }}
        className={`group relative flex w-full min-w-0 scroll-mt-16 gap-2 px-3 py-1 ${
          isOwn ? "justify-end" : "justify-start"
        }`}
        data-message-id={message.id}
      >
        <div
          className={`flex min-w-0 max-w-[78%] flex-col ${isOwn ? "items-end" : "items-start"}`}
        >
          {/* Sender name (for non-own + showSender) */}
          {!isOwn && showSender && (
            <span
              className={`mb-0.5 px-1 text-[10px] font-semibold ${ROLE_COLORS[authorRole].text}`}
            >
              {message.senderName}
              {message.isAdmin && " (Admin)"}
            </span>
          )}

          {/* Internal-note label */}
          {message.isInternal && (
            <span className="mb-0.5 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
              <Lock className="h-2.5 w-2.5" />
              {t("support.internal_note_admin_only")}
            </span>
          )}

          <div
            ref={bubbleRef}
            {...longPress}
            className={`relative min-w-0 max-w-full overflow-hidden rounded-2xl px-3 py-2 shadow-sm ${
              message.isInternal
                ? "border border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100"
                : isOwn
                ? "bg-primary text-primary-foreground"
                : message.isAdmin
                  ? "border border-primary/20 bg-primary/10 text-foreground"
                  : "bg-muted text-foreground"
            } ${message.status === "error" ? "ring-1 ring-destructive/60" : ""} ${
              highlight ? "ring-2 ring-primary animate-pulse" : ""
            }`}
            style={{ touchAction: "pan-y", userSelect: "text" }}
          >
            {/* Reply quote */}
            {message.replyToId && (
              <SupportReplyQuote
                replyToName={message.replyToName}
                replyToContent={message.replyToContent}
                onClick={handleReplyQuoteClick}
                isMissing={!replyExists}
              />
            )}

            {/* Body */}
            <SupportMessageContent
              message={message}
              onImageClick={onImageClick}
            />

            {/* Footer: timestamp + edited + status */}
            <div
              className={`mt-0.5 flex items-center justify-end gap-1 text-[9px] ${
                isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
              }`}
            >
              {message.editedAt && (
                <span className="italic opacity-80">
                  {t("support.edited")}
                </span>
              )}
              <span>
                {new Date(message.createdAt).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {isOwn && (
                <ReadReceiptIcon
                  status={message.status}
                  isRead={isRead}
                  readAt={readAt}
                  readerKind={readerKind}
                  className={isOwn ? "text-primary-foreground/80" : ""}
                />
              )}
            </div>

            {/* Quick-react popover */}
            <SupportEmojiPopover
              open={showReactPopover}
              onClose={() => setShowReactPopover(false)}
              onPick={(emoji) => onToggleReaction(message.id, emoji)}
              side={isOwn ? "right" : "left"}
            />
          </div>

          {/* Reactions bar (under bubble) */}
          {reactions.length > 0 && (
            <SupportReactionsBar
              reactions={reactions}
              myKey={myKey}
              onToggle={(emoji) => onToggleReaction(message.id, emoji)}
              isInflight={(emoji) => isReactionInflight(message.id, emoji)}
              align={isOwn ? "end" : "start"}
            />
          )}

          {/* Error retry row */}
          {message.status === "error" && (
            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-destructive">
              <span>{t("support.send_failed")}</span>
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1 underline hover:no-underline"
              >
                <RotateCw className="h-3 w-3" />
                {t("support.retry")}
              </button>
              <button
                onClick={onRemoveFailed}
                className="ml-1 opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Controlled action menu - opened by long-press (touch) or desktop ⋯ button.
            Trigger is a hidden 1px anchor positioned at top of bubble corner so the
            menu floats next to the bubble. The hidden anchor lets BaseUI Menu compute
            position without any visible UI on touch devices. */}
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger
            render={
              <button
                aria-hidden
                tabIndex={-1}
                className={`pointer-events-none absolute top-1 h-1 w-1 opacity-0 ${
                  isOwn ? "right-2" : "left-2"
                }`}
              />
            }
          />
          <DropdownMenuContent
            align={isOwn ? "end" : "start"}
            className="w-44"
          >
            {menuItems}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Hover toolbar - only visible on hover-capable devices (desktop / mouse).
            Hidden entirely on touch via @media(hover:hover) so iOS Safari can't
            leave it stuck-visible after a tap. */}
        <div
          className={`hidden shrink-0 items-center self-center opacity-0 transition-opacity [@media(hover:hover)]:flex group-hover:opacity-100 ${
            isOwn ? "order-first" : ""
          }`}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowReactPopover((v) => !v)}
            title={t("support.add_reaction")}
          >
            <Smile className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleReplyAction}
            title={t("support.reply")}
          >
            <Reply className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setMenuOpen(true)}
            title={t("support.message_info")}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </div>
      </motion.div>
    </SupportSwipeReplyWrapper>
  );
}
