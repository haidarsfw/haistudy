"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useTranslation } from "@/components/providers/language-provider";
import { SUPPORT_GROUP_WINDOW_MS } from "@/lib/constants";
import type {
  SupportMessage,
  SupportReaction,
  SupportReadReceipt,
  SupportReaderKind,
  SupportTypingState,
} from "@/types";
import { SupportMessageGroup } from "./support-message-group";
import { SupportTypingIndicator } from "./support-typing-indicator";
import { SupportJumpToUnread } from "./support-jump-to-unread";

interface AuthorMeta {
  isTester?: boolean;
  packageTier?: "share" | "normal" | "vip" | "diamond" | null;
}

interface Props {
  messages: SupportMessage[];
  /** Conversation owner key — used to reset scroll/initial state on switch. */
  licenseKey: string | null;
  myKey: string | null;
  myKind: SupportReaderKind;
  ownerMeta?: AuthorMeta;
  reactionsByMessage: Map<string, SupportReaction[]>;
  receiptsByMessage: Map<string, SupportReadReceipt[]>;
  typing: SupportTypingState | null;
  onReply: (msg: SupportMessage) => void;
  onEdit: (msg: SupportMessage) => void;
  onToggleReaction: (id: string, emoji: string) => void;
  isReactionInflight: (id: string, emoji: string) => boolean;
  onImageClick?: (url: string) => void;
  onRetry?: (clientNonce: string) => void;
  onRemoveFailed?: (clientNonce: string) => void;
  /** Signal to mark a message as read up to this id when bottom is in view. */
  onBottomVisible?: (lastMessageId: string) => void;
  /** Empty-state contents (passed by panel for i18n customization). */
  emptyState?: React.ReactNode;
  /** True while messages are being fetched initially. */
  loading?: boolean;
}

const NEAR_BOTTOM_PX = 80;

function formatDateSeparator(d: Date, t: (k: string) => string): string {
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return t("support.today");
  if (sameDay(d, yest)) return t("support.yesterday");
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

interface RenderItem {
  kind: "date" | "group";
  key: string;
  date?: Date;
  group?: SupportMessage[];
}

/**
 * Builds the list:
 *  • date separator chips between days
 *  • groups of consecutive same-sender messages within SUPPORT_GROUP_WINDOW_MS
 */
function buildRenderItems(messages: SupportMessage[]): RenderItem[] {
  const out: RenderItem[] = [];
  let lastDay: string | null = null;
  let currentGroup: SupportMessage[] = [];
  let groupSenderKey: string | null = null;

  const flush = () => {
    if (currentGroup.length > 0) {
      out.push({
        kind: "group",
        key: `g-${currentGroup[0].id}`,
        group: currentGroup,
      });
      currentGroup = [];
    }
  };

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const d = new Date(m.createdAt);
    const dayKey = d.toISOString().slice(0, 10);
    if (dayKey !== lastDay) {
      flush();
      out.push({ kind: "date", key: `d-${dayKey}`, date: d });
      lastDay = dayKey;
      groupSenderKey = null;
    }

    // System messages are own-group always
    if (m.isSystem || m.type === "system") {
      flush();
      out.push({ kind: "group", key: `g-${m.id}`, group: [m] });
      groupSenderKey = null;
      continue;
    }

    const senderKey = `${m.isAdmin ? "a" : "u"}::${m.senderName}`;
    const prev = currentGroup[currentGroup.length - 1];
    const sameSender = senderKey === groupSenderKey;
    const within =
      prev &&
      Math.abs(
        new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime()
      ) < SUPPORT_GROUP_WINDOW_MS;

    if (sameSender && within) {
      currentGroup.push(m);
    } else {
      flush();
      currentGroup = [m];
      groupSenderKey = senderKey;
    }
  }
  flush();
  return out;
}

export function SupportMessageList({
  messages,
  licenseKey,
  myKey,
  myKind,
  ownerMeta,
  reactionsByMessage,
  receiptsByMessage,
  typing,
  onReply,
  onEdit,
  onToggleReaction,
  isReactionInflight,
  onImageClick,
  onRetry,
  onRemoveFailed,
  onBottomVisible,
  emptyState,
  loading,
}: Props) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastMessageIdRef = useRef<string | null>(null);

  const items = useMemo(() => buildRenderItems(messages), [messages]);
  const knownIds = useMemo(
    () => new Set(messages.map((m) => m.id)),
    [messages]
  );

  /* ── Auto-scroll when at bottom + new message arrives ── */
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) return;
    const newId = last.id;
    if (lastMessageIdRef.current !== newId) {
      lastMessageIdRef.current = newId;
      // Auto-scroll only if already near bottom
      if (isAtBottom && scrollRef.current) {
        // Defer to next paint so layout is settled
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        });
      } else if (!last.isAdmin === (myKind === "admin")) {
        // Counter only OTHER side messages
        setUnreadCount((c) => c + 1);
      }
    }
  }, [messages, isAtBottom, myKind]);

  /* ── Force-scroll on initial load + when count goes from 0 ── */
  const initialDone = useRef(false);

  // Reset auto-scroll trigger when conversation switches
  useEffect(() => {
    initialDone.current = false;
    lastMessageIdRef.current = null;
    setIsAtBottom(true);
    setUnreadCount(0);
  }, [licenseKey]);

  useEffect(() => {
    if (!loading && !initialDone.current && messages.length > 0 && scrollRef.current) {
      initialDone.current = true;
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [loading, messages.length]);

  /* ── Track scroll position ── */
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.clientHeight - el.scrollTop;
    const atBottom = distFromBottom < NEAR_BOTTOM_PX;
    setIsAtBottom(atBottom);
    if (atBottom) {
      setUnreadCount(0);
      const last = messages[messages.length - 1];
      if (last && onBottomVisible) onBottomVisible(last.id);
    }
  }, [messages, onBottomVisible]);

  /* ── Mark-read when scrolled to bottom (initial) ── */
  useEffect(() => {
    if (isAtBottom && messages.length > 0 && onBottomVisible) {
      onBottomVisible(messages[messages.length - 1].id);
    }
  }, [isAtBottom, messages, onBottomVisible]);

  /* ── Re-fire mark-read when tab becomes visible ── */
  useEffect(() => {
    if (!onBottomVisible) return;
    const onVis = () => {
      if (
        !document.hidden &&
        isAtBottom &&
        messages.length > 0 &&
        onBottomVisible
      ) {
        onBottomVisible(messages[messages.length - 1].id);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [isAtBottom, messages, onBottomVisible]);

  /* ── Scroll to message + flash highlight ── */
  const scrollToMessage = useCallback((id: string) => {
    const el = scrollRef.current?.querySelector(`[data-message-id="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedId(id);
      setTimeout(() => setHighlightedId(null), 1100);
    }
  }, []);

  const jumpToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
    setUnreadCount(0);
  };

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-x-hidden overflow-y-auto px-1 py-3 [overscroll-behavior:contain]"
      >
        {loading ? (
          <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
            …
          </div>
        ) : messages.length === 0 ? (
          emptyState ?? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              {t("support.no_messages")}
            </div>
          )
        ) : (
          <div className="space-y-3">
            {items.map((it) =>
              it.kind === "date" ? (
                <div key={it.key} className="my-2 flex justify-center">
                  <span className="rounded-full bg-muted/70 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {formatDateSeparator(it.date!, t)}
                  </span>
                </div>
              ) : (
                <SupportMessageGroup
                  key={it.key}
                  messages={it.group!}
                  myKey={myKey}
                  myKind={myKind}
                  ownerMeta={ownerMeta}
                  reactionsByMessage={reactionsByMessage}
                  receiptsByMessage={receiptsByMessage}
                  knownIds={knownIds}
                  onReply={onReply}
                  onEdit={onEdit}
                  onToggleReaction={onToggleReaction}
                  isReactionInflight={isReactionInflight}
                  onImageClick={onImageClick}
                  onScrollToMessage={scrollToMessage}
                  onRetry={onRetry}
                  onRemoveFailed={onRemoveFailed}
                  highlightedId={highlightedId}
                />
              )
            )}
          </div>
        )}

        {typing && <SupportTypingIndicator typing={typing} />}
      </div>

      <SupportJumpToUnread
        count={unreadCount}
        visible={!isAtBottom}
        onClick={jumpToBottom}
      />
    </div>
  );
}
