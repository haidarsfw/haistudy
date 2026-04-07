"use client";

import { memo, type ReactNode } from "react";
import { Bot, User } from "lucide-react";
import { motion } from "framer-motion";
import type { AiMessage } from "@/hooks/use-ai-chat";
import { springGentle } from "@/lib/motion";
import katex from "katex";

interface AiMessageBubbleProps {
  message: AiMessage;
  isStreaming?: boolean;
}

function renderKatex(latex: string, key: string, display = false): ReactNode {
  try {
    const html = katex.renderToString(latex, {
      throwOnError: false,
      displayMode: display,
      trust: true,
    });
    return display ? (
      <div
        key={key}
        className="katex-display my-2 overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    ) : (
      <span
        key={key}
        className="katex-inline"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch {
    return <code key={key}>{latex}</code>;
  }
}

/**
 * Split text into math segments and non-math segments.
 * Handles: $$...$$, $...$, \[...\], \(...\)
 * Math is extracted first to prevent markdown parsing from corrupting LaTeX.
 */
function splitMath(text: string): Array<{ type: "text" | "math-inline" | "math-display"; value: string }> {
  const segments: Array<{ type: "text" | "math-inline" | "math-display"; value: string }> = [];
  // Match display math first ($$...$$, \[...\]), then inline ($...$, \(...\))
  const mathRegex = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\$([^$\n]+?)\$|\\\((.+?)\\\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      segments.push({ type: "math-display", value: match[1] });
    } else if (match[2] !== undefined) {
      segments.push({ type: "math-display", value: match[2] });
    } else if (match[3] !== undefined) {
      segments.push({ type: "math-inline", value: match[3] });
    } else if (match[4] !== undefined) {
      segments.push({ type: "math-inline", value: match[4] });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments;
}

/** Parse markdown formatting: **bold**, *italic*, `code` */
function parseMarkdownInline(text: string, keyPrefix: string): ReactNode[] {
  const result: ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let partIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      result.push(
        <strong key={`${keyPrefix}-b-${partIndex}`} className="font-semibold">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      result.push(
        <em key={`${keyPrefix}-i-${partIndex}`}>{match[3]}</em>
      );
    } else if (match[4]) {
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

  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result;
}

/** Render a full message: split math first, then process markdown in text segments */
function renderMarkdown(text: string): ReactNode[] {
  const lines = text.split("\n");
  const elements: ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (i > 0) elements.push(<br key={`br-${i}`} />);

    const segments = splitMath(lines[i]);
    for (let j = 0; j < segments.length; j++) {
      const seg = segments[j];
      const key = `l${i}-s${j}`;
      if (seg.type === "math-inline") {
        elements.push(renderKatex(seg.value, key, false));
      } else if (seg.type === "math-display") {
        elements.push(renderKatex(seg.value, key, true));
      } else {
        elements.push(...parseMarkdownInline(seg.value, key));
      }
    }
  }

  return elements;
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
          <div>
            {message.image && (
              <img
                src={message.image}
                alt="Uploaded"
                className="max-w-full max-h-48 rounded-lg mb-2"
              />
            )}
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
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
