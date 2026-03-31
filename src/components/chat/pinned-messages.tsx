"use client";

import { useState } from "react";
import { Pin, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/types";

interface PinnedMessagesProps {
  messages: ChatMessage[];
}

export function PinnedMessages({ messages }: PinnedMessagesProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (messages.length === 0) return null;

  return (
    <div className="border-b border-border bg-primary/5">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-primary/10 transition-colors"
      >
        <Pin className="h-3 w-3 text-primary" />
        <span className="font-medium text-primary">
          {messages.length} pinned message{messages.length > 1 ? "s" : ""}
        </span>
        <span className="flex-1" />
        {isExpanded ? (
          <ChevronUp className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-1 px-3 pb-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="rounded-md bg-background/80 px-3 py-2 text-xs"
            >
              <span className="font-semibold">{msg.authorName}: </span>
              <span className="text-muted-foreground">
                {msg.type === "text"
                  ? msg.content.length > 120
                    ? msg.content.slice(0, 120) + "…"
                    : msg.content
                  : msg.type === "image"
                    ? "[Gambar]"
                    : "[Audio]"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
