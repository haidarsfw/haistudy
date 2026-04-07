"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./message-bubble";
import { APP_EVENTS } from "@/lib/events";
import type { ChatMessage } from "@/types";

interface MessageListProps {
  messages: ChatMessage[];
  pinnedIds: string[];
  currentDeviceId: string;
  isAdmin: boolean;
  onReply: (message: ChatMessage) => void;
  onDelete: (messageId: string) => void;
  onPin: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
  onImageClick?: (src: string) => void;
  isOpen?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  hasMore?: boolean;
}

export function MessageList({
  messages,
  pinnedIds,
  currentDeviceId,
  isAdmin,
  onReply,
  onDelete,
  onPin,
  onUnpin,
  onImageClick,
  isOpen,
  onLoadMore,
  isLoadingMore,
  hasMore,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  // Auto-scroll to bottom on new messages (if user is near bottom)
  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  // Initial scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, []);

  // Scroll to bottom when panel opens
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView();
      });
    }
  }, [isOpen]);

  // Scroll to a specific message (from mention notification click)
  const scrollToMessage = useCallback((e: Event) => {
    const messageId = (e as CustomEvent).detail?.messageId;
    if (!messageId) return;

    // Find the element with the matching data-message-id
    const el = document.querySelector(`[data-message-id="${messageId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Add highlight animation
      el.classList.add("ring-2", "ring-primary/50", "bg-primary/5", "rounded-lg");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-primary/50", "bg-primary/5", "rounded-lg");
      }, 2500);
    }
  }, []);

  useEffect(() => {
    window.addEventListener(APP_EVENTS.SCROLL_TO_MESSAGE, scrollToMessage);
    return () => window.removeEventListener(APP_EVENTS.SCROLL_TO_MESSAGE, scrollToMessage);
  }, [scrollToMessage]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const threshold = 100;
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;

    // Lazy load older messages when scrolling near top
    if (el.scrollTop < 80 && hasMore && !isLoadingMore && onLoadMore) {
      onLoadMore();
    }
  };

  // Group messages by date
  const groupedMessages: Array<{ date: string; messages: ChatMessage[] }> = [];
  let currentDate = "";

  // Filter out deleted messages (no ghost "Pesan telah dihapus" text)
  const visibleMessages = messages.filter((m) => !m.deleted);

  for (const msg of visibleMessages) {
    const msgDate = new Date(msg.createdAt).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msgDate, messages: [] });
    }
    groupedMessages[groupedMessages.length - 1].messages.push(msg);
  }

  // Build a map of authorName -> role for mention coloring
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const userRoleMap = useMemo(() => {
    const map = new Map<string, "admin" | "diamond" | "vip" | "tester" | "normal">();
    for (const m of messages) {
      const name = m.authorName.toLowerCase();
      if (map.has(name)) continue;
      if (m.isAdmin) map.set(name, "admin");
      else if (m.packageTier === "diamond") map.set(name, "diamond");
      else if (m.packageTier === "vip") map.set(name, "vip");
      else if (m.isTester) map.set(name, "tester");
      else map.set(name, "normal");
    }
    return map;
  }, [messages]);

  if (visibleMessages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Belum ada pesan. Mulai percakapan!
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef} onScroll={handleScroll}>
      <div className="py-2">
        {isLoadingMore && (
          <div className="flex justify-center py-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        {!hasMore && messages.length > 0 && (
          <p className="text-center text-[10px] text-muted-foreground py-2">Awal percakapan</p>
        )}
        {groupedMessages.map((group) => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="sticky top-0 z-10 flex justify-center py-2">
              <span className="rounded-full bg-muted px-3 py-0.5 text-[10px] font-medium text-muted-foreground">
                {group.date}
              </span>
            </div>

            {/* Messages */}
            {group.messages.map((msg) => (
              <div key={msg.id} data-message-id={msg.id} className="transition-all duration-300">
                <MessageBubble
                  message={msg}
                  isOwn={msg.authorId === currentDeviceId}
                  isAdmin={isAdmin}
                  isPinned={pinnedIds.includes(msg.id)}
                  onReply={onReply}
                  onDelete={onDelete}
                  onPin={onPin}
                  onUnpin={onUnpin}
                  onImageClick={onImageClick}
                  userRoleMap={userRoleMap}
                />
              </div>
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
