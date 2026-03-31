"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./message-bubble";
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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const threshold = 100;
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  };

  // Group messages by date
  const groupedMessages: Array<{ date: string; messages: ChatMessage[] }> = [];
  let currentDate = "";

  for (const msg of messages) {
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

  if (messages.length === 0) {
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
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.authorId === currentDeviceId}
                isAdmin={isAdmin}
                isPinned={pinnedIds.includes(msg.id)}
                onReply={onReply}
                onDelete={onDelete}
                onPin={onPin}
                onUnpin={onUnpin}
                onImageClick={onImageClick}
              />
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
