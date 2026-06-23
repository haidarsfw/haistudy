"use client";

import { useState } from "react";
import { Pin, ChevronDown, ChevronUp } from "lucide-react";
import type { ChatMessage } from "@/types";

interface PinnedMessagesProps {
  messages: ChatMessage[];
  onJump?: (messageId: string) => void;
}

export function PinnedMessages({ messages, onJump }: PinnedMessagesProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (messages.length === 0) return null;

  return (
    <div className="border-b border-border bg-primary/5">
      <div className="flex items-center">
        <button
          onClick={() => onJump?.(messages[messages.length - 1].id)}
          className="flex flex-1 items-center gap-2 px-3 py-2 text-xs hover:bg-primary/10 transition-colors text-left cursor-pointer min-w-0"
        >
          <Pin className="h-3 w-3 text-primary shrink-0" />
          <span className="font-medium text-primary truncate flex-1">
            {messages.length === 1 ? (
              <>
                <span className="font-semibold text-primary/80">{messages[0].authorName}: </span>
                <span>
                  {messages[0].type === "text"
                    ? messages[0].content.length > 60
                      ? messages[0].content.slice(0, 60) + "…"
                      : messages[0].content
                    : messages[0].type === "image"
                      ? "[Gambar]"
                      : "[Pesan suara]"}
                </span>
              </>
            ) : (
              `${messages.length} pinned messages`
            )}
          </span>
        </button>

        {messages.length > 1 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label={isExpanded ? "Collapse pinned messages" : "Expand pinned messages"}
          >
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>

      {isExpanded && messages.length > 1 && (
        <div className="space-y-1 px-3 pb-2">
          {messages.map((msg) => (
            <button
              key={msg.id}
              onClick={() => onJump?.(msg.id)}
              className="flex w-full text-left rounded-md bg-background/80 hover:bg-background/90 transition-colors px-3 py-2 text-xs cursor-pointer"
            >
              <span className="font-semibold shrink-0">{msg.authorName}: </span>
              <span className="text-muted-foreground truncate flex-1 ml-1">
                {msg.type === "text"
                  ? msg.content.length > 120
                    ? msg.content.slice(0, 120) + "…"
                    : msg.content
                  : msg.type === "image"
                    ? "[Gambar]"
                    : "[Pesan suara]"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
