"use client";

import { memo, type ReactNode } from "react";
import { Bot, User } from "lucide-react";
import { motion } from "framer-motion";
import type { AiMessage } from "@/hooks/use-ai-chat";
import { springGentle } from "@/lib/motion";

interface AiMessageBubbleProps {
  message: AiMessage;
  isStreaming?: boolean;
}

/** Parse simple markdown (bold, italic, inline code) into React elements. */
function renderMarkdown(text: string): ReactNode[] {
  const lines = text.split("\n");
  const elements: ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (i > 0) elements.push(<br key={`br-${i}`} />);
    elements.push(...parseInline(lines[i], `line-${i}`));
  }

  return elements;
}

function parseInline(text: string, keyPrefix: string): ReactNode[] {
  const result: ReactNode[] = [];
  // Match **bold**, *italic*, `code`
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let partIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // Bold **text**
      result.push(
        <strong key={`${keyPrefix}-b-${partIndex}`} className="font-semibold">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // Italic *text*
      result.push(
        <em key={`${keyPrefix}-i-${partIndex}`}>{match[3]}</em>
      );
    } else if (match[4]) {
      // Inline code `text`
      result.push(
        <code
          key={`${keyPrefix}-c-${partIndex}`}
          className="rounded bg-background/50 px-1 py-0.5 text-xs"
        >
          {match[4]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
    partIndex++;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result;
}

export const AiMessageBubble = memo(function AiMessageBubble({
  message,
  isStreaming,
}: AiMessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springGentle}
      className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-accent text-accent-foreground"
        }`}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5" />
        ) : (
          <Bot className="h-3.5 w-3.5" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md bg-muted text-foreground"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : message.content ? (
          <div className="space-y-1 whitespace-pre-wrap">
            {renderMarkdown(message.content)}
          </div>
        ) : isStreaming ? (
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
          </div>
        ) : null}
      </div>
    </motion.div>
  );
});
