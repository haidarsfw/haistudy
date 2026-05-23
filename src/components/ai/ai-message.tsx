"use client";

import { memo, useState, type ReactNode } from "react";
import { Bot, User, X } from "lucide-react";
import { motion } from "framer-motion";
import type { AiMessage } from "@/hooks/use-ai-chat";
import { springGentle } from "@/lib/motion";
import katex from "katex";
import "katex/dist/katex.min.css";

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
 * Render strategy: extract math into placeholders → classify lines (heading / bullet /
 * ordered / quote / paragraph) → restore math. This prevents math delimiters from
 * breaking markdown patterns AND gives block-level elements their own <div> so lists
 * and headings render as proper rows, not prefixed by literal `*` or `##` tokens.
 */
function renderMarkdown(text: string): ReactNode[] {
  const mathMap = new Map<string, { latex: string; display: boolean }>();
  let counter = 0;

  // 1. Replace all math with placeholders (unchanged)
  const processed = text
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, latex) => {
      const id = `__MATH_${counter++}__`;
      mathMap.set(id, { latex, display: true });
      return id;
    })
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, latex) => {
      const id = `__MATH_${counter++}__`;
      mathMap.set(id, { latex, display: true });
      return id;
    })
    .replace(/\$([^$\n]+?)\$/g, (_, latex) => {
      const id = `__MATH_${counter++}__`;
      mathMap.set(id, { latex, display: false });
      return id;
    })
    .replace(/\\\((.+?)\\\)/g, (_, latex) => {
      const id = `__MATH_${counter++}__`;
      mathMap.set(id, { latex, display: false });
      return id;
    });

  // 2. Classify & render each line
  const lines = processed.split("\n");
  const elements: ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trimEnd();

    // Blank line → small vertical spacer
    if (rawLine.trim() === "") {
      elements.push(<div key={`sp-${i}`} className="h-2" />);
      continue;
    }

    // Heading: #, ##, ### (up to 3 leading spaces allowed)
    const heading = rawLine.match(/^\s{0,3}(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const content = heading[2];
      const sizeClass =
        level === 1
          ? "font-bold text-[15px] mt-1"
          : level === 2
          ? "font-bold text-[14px] mt-1"
          : "font-semibold text-[13px]";
      elements.push(
        <div key={`h-${i}`} className={sizeClass}>
          {parseMarkdownInline(content, `h${i}`, mathMap)}
        </div>
      );
      continue;
    }

    // Unordered list bullet: *, -, or • at line start
    const bullet = rawLine.match(/^\s{0,3}[*\-•]\s+(.+)$/);
    if (bullet) {
      elements.push(
        <div key={`b-${i}`} className="flex gap-2 pl-1">
          <span className="shrink-0 select-none text-muted-foreground">•</span>
          <div className="flex-1">
            {parseMarkdownInline(bullet[1], `b${i}`, mathMap)}
          </div>
        </div>
      );
      continue;
    }

    // Ordered list item: "1." "2)" etc.
    const ordered = rawLine.match(/^\s{0,3}(\d+)[.)]\s+(.+)$/);
    if (ordered) {
      elements.push(
        <div key={`o-${i}`} className="flex gap-2 pl-1">
          <span className="shrink-0 select-none text-muted-foreground tabular-nums">
            {ordered[1]}.
          </span>
          <div className="flex-1">
            {parseMarkdownInline(ordered[2], `o${i}`, mathMap)}
          </div>
        </div>
      );
      continue;
    }

    // Blockquote: "> text"
    const quote = rawLine.match(/^\s{0,3}>\s*(.*)$/);
    if (quote) {
      elements.push(
        <div
          key={`q-${i}`}
          className="border-l-2 border-border pl-3 text-muted-foreground"
        >
          {parseMarkdownInline(quote[1], `q${i}`, mathMap)}
        </div>
      );
      continue;
    }

    // Default: paragraph-ish line
    elements.push(
      <div key={`l-${i}`}>
        {parseMarkdownInline(rawLine, `l${i}`, mathMap)}
      </div>
    );
  }

  return elements;
}

/** Replace __MATH_N__ placeholders in a string with rendered KaTeX nodes */
function expandMath(
  text: string,
  mathMap: Map<string, { latex: string; display: boolean }>,
  keyPrefix: string
): ReactNode[] {
  const parts = text.split(/(__MATH_\d+__)/g);
  const result: ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    const math = mathMap.get(parts[i]);
    if (math) {
      result.push(renderKatex(math.latex, `${keyPrefix}-m${i}`, math.display));
    } else if (parts[i]) {
      result.push(parts[i]);
    }
  }
  return result;
}

/** Parse **bold**, *italic*, `code`, ~~strike~~ — with math placeholders resolved */
function parseMarkdownInline(
  text: string,
  keyPrefix: string,
  mathMap: Map<string, { latex: string; display: boolean }>
): ReactNode[] {
  const result: ReactNode[] = [];
  // Matches: **bold**, *italic* (lookarounds reject `**` and word-inside), `code`, ~~strike~~
  const regex =
    /(\*\*([^*\n]+?)\*\*|(?<![*\w])\*([^*\n]+?)\*(?![*\w])|`([^`\n]+?)`|~~([^~\n]+?)~~)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(
        ...expandMath(
          text.slice(lastIndex, match.index),
          mathMap,
          `${keyPrefix}-t${idx}`
        )
      );
    }
    if (match[2]) {
      result.push(
        <strong key={`${keyPrefix}-b${idx}`} className="font-semibold">
          {expandMath(match[2], mathMap, `${keyPrefix}-b${idx}`)}
        </strong>
      );
    } else if (match[3]) {
      result.push(
        <em key={`${keyPrefix}-i${idx}`}>
          {expandMath(match[3], mathMap, `${keyPrefix}-i${idx}`)}
        </em>
      );
    } else if (match[4]) {
      result.push(
        <code
          key={`${keyPrefix}-c${idx}`}
          className="rounded bg-background/50 px-1 py-0.5 text-xs"
        >
          {match[4]}
        </code>
      );
    } else if (match[5]) {
      result.push(
        <s key={`${keyPrefix}-s${idx}`}>
          {expandMath(match[5], mathMap, `${keyPrefix}-s${idx}`)}
        </s>
      );
    }
    lastIndex = match.index + match[0].length;
    idx++;
  }
  if (lastIndex < text.length) {
    result.push(...expandMath(text.slice(lastIndex), mathMap, `${keyPrefix}-e`));
  }
  return result;
}

function ImagePreview({ src }: { src: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <img
        src={src}
        alt="Uploaded"
        className="max-w-full max-h-48 rounded-lg mb-2 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => setOpen(true)}
      />
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <button
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={src}
            alt="Preview"
            className="max-w-full max-h-[90vh] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
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
            {message.image && <ImagePreview src={message.image} />}
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        ) : message.content ? (
          <div className="space-y-0.5">{renderMarkdown(message.content)}</div>
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
