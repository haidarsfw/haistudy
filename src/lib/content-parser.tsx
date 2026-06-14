/**
 * Custom HTML tag parser for rangkuman content.
 * Converts custom markup tags to React elements.
 *
 * Supported tags: <h1>, <h2>, <h3>, <bullet>, <subtitle>, <warning>, <img>, <b>, <i>
 * Supports LaTeX math via $...$ (inline) using KaTeX
 */

import React from "react";
import Image from "next/image";
import katex from "katex";
import "katex/dist/katex.min.css";

const SUPABASE_STORAGE_URL =
  "https://gvjwxccwuyuhgexypgbn.supabase.co/storage/v1/object/public/slides";

interface ParsedElement {
  type: "h1" | "h2" | "h3" | "bullet" | "subtitle" | "warning" | "image" | "slide" | "text";
  content: React.ReactNode;
  label?: string;
}

function renderMath(latex: string, key: number): React.ReactNode {
  try {
    const html = katex.renderToString(latex, {
      throwOnError: false,
      displayMode: false,
      trust: true,
    });
    return (
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
 * Render forum/chat content: preserves newlines, parses $$...$$ (display) and $...$ (inline) math.
 */
export function parseForumContent(text: string): React.ReactNode {
  // Split on display math first ($$...$$), then handle inline within each segment
  const parts: React.ReactNode[] = [];
  // Use split to separate display math blocks
  const segments = text.split(/(\$\$[\s\S]+?\$\$)/g);
  let key = 0;

  for (const seg of segments) {
    if (seg.startsWith("$$") && seg.endsWith("$$")) {
      const latex = seg.slice(2, -2).trim();
      try {
        const html = katex.renderToString(latex, {
          throwOnError: false,
          displayMode: true,
          trust: true,
        });
        parts.push(
          <div
            key={key++}
            className="katex-display my-2 overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch {
        parts.push(<code key={key++} className="block my-2 text-xs">{latex}</code>);
      }
    } else if (seg) {
      // Split by newlines to preserve paragraphs
      const lines = seg.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i]) {
          parts.push(<React.Fragment key={key++}>{parseInlineMath(lines[i])}</React.Fragment>);
        }
        if (i < lines.length - 1) {
          parts.push(<br key={key++} />);
        }
      }
    }
  }

  return <>{parts}</>;
}

/** Parse only $...$ inline math within a text string */
function parseInlineMath(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\$([^$\n]+?)\$/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    try {
      const html = katex.renderToString(match[1], {
        throwOnError: false,
        displayMode: false,
        trust: true,
      });
      parts.push(
        <span key={key++} className="katex-inline" dangerouslySetInnerHTML={{ __html: html }} />
      );
    } catch {
      parts.push(<code key={key++}>{match[1]}</code>);
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

export function parseInline(text: string): React.ReactNode {
  // Parse <b>, <i>, and $...$ (math) tags within text
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    // Find next <b>, <i>, or $...$
    const boldMatch = remaining.match(/<b>([\s\S]*?)<\/b>/);
    const italicMatch = remaining.match(/<i>([\s\S]*?)<\/i>/);
    const mathMatch = remaining.match(/\$([^$]+)\$/);

    // Determine which match comes first
    const candidates: { match: RegExpMatchArray; tag: "b" | "i" | "math" }[] =
      [];
    if (boldMatch && boldMatch.index !== undefined)
      candidates.push({ match: boldMatch, tag: "b" });
    if (italicMatch && italicMatch.index !== undefined)
      candidates.push({ match: italicMatch, tag: "i" });
    if (mathMatch && mathMatch.index !== undefined)
      candidates.push({ match: mathMatch, tag: "math" });

    if (candidates.length === 0) {
      parts.push(remaining);
      break;
    }

    // Sort by position
    candidates.sort((a, b) => (a.match.index ?? 0) - (b.match.index ?? 0));
    const first = candidates[0];
    const nextMatch = first.match;
    const tag = first.tag;

    if (nextMatch.index === undefined) {
      parts.push(remaining);
      break;
    }

    // Text before the match
    if (nextMatch.index > 0) {
      parts.push(remaining.slice(0, nextMatch.index));
    }

    // The styled content
    if (tag === "math") {
      parts.push(renderMath(nextMatch[1], keyIdx++));
    } else if (tag === "b") {
      const innerContent = parseInline(nextMatch[1]);
      parts.push(
        <strong key={keyIdx++} className="font-semibold">
          {innerContent}
        </strong>
      );
    } else {
      const innerContent = parseInline(nextMatch[1]);
      parts.push(
        <em key={keyIdx++} className="italic">
          {innerContent}
        </em>
      );
    }

    remaining = remaining.slice(nextMatch.index + nextMatch[0].length);
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

/**
 * Like parseInline but treats embedded newlines as line breaks. Used for block
 * tags (e.g. <bullet>) whose body can span multiple source lines. Single-line
 * input behaves identically to parseInline.
 */
function parseInlineML(text: string): React.ReactNode {
  if (!text.includes("\n")) return parseInline(text);
  const segments = text.split("\n");
  return (
    <>
      {segments.map((seg, k) => (
        <React.Fragment key={k}>
          {k > 0 ? <br /> : null}
          {parseInline(seg.trim())}
        </React.Fragment>
      ))}
    </>
  );
}

function parseLine(line: string): ParsedElement | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Match block-level tags
  const h1 = trimmed.match(/^<h1>([\s\S]*?)<\/h1>$/);
  if (h1) return { type: "h1", content: parseInlineML(h1[1]) };

  const h2 = trimmed.match(/^<h2>([\s\S]*?)<\/h2>$/);
  if (h2) return { type: "h2", content: parseInlineML(h2[1]) };

  const h3 = trimmed.match(/^<h3>([\s\S]*?)<\/h3>$/);
  if (h3) return { type: "h3", content: parseInlineML(h3[1]) };

  const bullet = trimmed.match(/^<bullet>([\s\S]*?)<\/bullet>$/);
  if (bullet) return { type: "bullet", content: parseInlineML(bullet[1]) };

  const subtitle = trimmed.match(/^<subtitle>([\s\S]*?)<\/subtitle>$/);
  if (subtitle) return { type: "subtitle", content: parseInlineML(subtitle[1]) };

  const warning = trimmed.match(/^<warning>([\s\S]*?)<\/warning>$/);
  if (warning) return { type: "warning", content: parseInlineML(warning[1]) };

  const img = trimmed.match(/^<img\s+src="(\/[^"]+)"(?:\s+alt="([^"]*)")?\s*\/?>$/);
  if (img) return { type: "image", content: img[1], label: img[2] || "" };

  const slide = trimmed.match(/^<slide\s+src="([^"]+)"(?:\s+alt="([^"]*)")?\s*\/>$/);
  if (slide) {
    const src = `${SUPABASE_STORAGE_URL}/${slide[1]}`;
    const alt = slide[2] || "Slide";
    return {
      type: "slide",
      label: alt,
      content: (
        <Image
          src={src}
          alt={alt}
          width={1920}
          height={1080}
          className="w-full h-auto rounded-lg"
          unoptimized
        />
      ),
    };
  }

  // Plain text with possible inline tags
  return { type: "text", content: parseInline(trimmed) };
}

export function parseRangkuman(content: string): React.ReactNode {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    let source = lines[i];
    const trimmed = source.trim();

    // Display math block: a line that is exactly $$...$$ renders centered on
    // its own line (formulas stack vertically). Wide ones scroll horizontally
    // instead of breaking the layout. Inline $...$ stays inline via parseInline.
    const displayMath = trimmed.match(/^\$\$([\s\S]+?)\$\$$/);
    if (displayMath) {
      let html = "";
      try {
        html = katex.renderToString(displayMath[1].trim(), {
          throwOnError: false,
          displayMode: true,
          trust: true,
        });
      } catch {
        html = "";
      }
      elements.push(
        html ? (
          <div
            key={i}
            data-tts-line={i}
            className="katex-display my-3 overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <code key={i} data-tts-line={i} className="block my-3 text-sm">
            {displayMath[1].trim()}
          </code>
        )
      );
      continue;
    }

    // Multi-line block tag: opening tag on this line, closing tag on a later
    // line (e.g. a <bullet> whose body has an "Example:" on the next line).
    // Accumulate through the closing line so it renders as one block.
    const open = trimmed.match(/^<(h1|h2|h3|bullet|subtitle|warning)>/);
    if (open && !trimmed.includes(`</${open[1]}>`)) {
      const tag = open[1];
      let j = i;
      const buf: string[] = [];
      while (j < lines.length) {
        buf.push(lines[j]);
        if (lines[j].includes(`</${tag}>`)) break;
        j++;
      }
      source = buf.join("\n");
      i = j; // resume after the closing line
    }

    const parsed = parseLine(source);
    if (!parsed) continue;

    switch (parsed.type) {
      case "h1":
        elements.push(
          <h2
            key={i}
            data-tts-line={i}
            className="font-heading text-xl font-bold mt-8 mb-3 first:mt-0 transition-colors duration-300"
          >
            {parsed.content}
          </h2>
        );
        break;
      case "h2":
        elements.push(
          <h3
            key={i}
            data-tts-line={i}
            className="font-heading text-lg font-semibold mt-7 mb-2 transition-colors duration-300"
          >
            {parsed.content}
          </h3>
        );
        break;
      case "h3":
        elements.push(
          <h4
            key={i}
            data-tts-line={i}
            className="font-heading text-base font-semibold mt-5 mb-2 transition-colors duration-300"
          >
            {parsed.content}
          </h4>
        );
        break;
      case "bullet":
        elements.push(
          <div
            key={i}
            data-tts-line={i}
            className="flex gap-2.5 my-1 pl-1 transition-colors duration-300 rounded"
          >
            {/* Dot in a line-height box so it centers on the first text line,
                not floats below it. h-7 == leading-7. */}
            <span className="flex h-7 shrink-0 items-center" aria-hidden="true">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            <span className="text-base leading-7">{parsed.content}</span>
          </div>
        );
        break;
      case "slide":
        elements.push(
          <details key={i} data-tts-line={i} className="my-3 overflow-hidden rounded-lg border border-border group">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2 select-none">
              <svg className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-open:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              {parsed.label ? parseInline(parsed.label) : "Slide"}
            </summary>
            {parsed.content}
          </details>
        );
        break;
      case "subtitle":
        elements.push(
          <p
            key={i}
            data-tts-line={i}
            className="text-base text-muted-foreground mt-2 mb-5 italic leading-7 transition-colors duration-300"
          >
            {parsed.content}
          </p>
        );
        break;
      case "warning":
        elements.push(
          <div
            key={i}
            data-tts-line={i}
            className="my-4 flex gap-2 rounded-lg border-l-4 border-amber-500 bg-amber-50 px-4 py-3 transition-colors duration-300 dark:bg-amber-950/30"
          >
            <span className="text-base leading-7 text-amber-900 dark:text-amber-200">
              {parsed.content}
            </span>
          </div>
        );
        break;
      case "image":
        elements.push(
          <div key={i} data-tts-line={i} className="my-4">
            <Image
              src={parsed.content as string}
              alt={parsed.label || "Gambar"}
              width={1200}
              height={800}
              unoptimized
              className="w-full h-auto rounded-lg border border-border"
            />
            {parsed.label ? (
              <p className="mt-1 text-center text-xs text-muted-foreground">
                {parsed.label}
              </p>
            ) : null}
          </div>
        );
        break;
      default: {
        // Auto-render slide/example callouts (e.g. "Contoh dari slide (...)",
        // "Contoh tambahan ...", "Latihan dari slide ...") as a COLLAPSED
        // left-bordered <details> so dense example blocks don't fatigue the
        // eye - the summary shows the bold lead-in label, expand to read it.
        // Detected from the raw source prefix, so no content markup change is
        // needed across existing rangkuman.
        const src = source.trim();
        const isCallout = /^<b>\s*(Contoh|Latihan)\s+(dari slide|tambahan)/i.test(
          src
        );
        if (isCallout) {
          const split = src.match(/^<b>([\s\S]*?)<\/b>\s*([\s\S]*)$/);
          const label = split ? split[1].replace(/:\s*$/, "") : "Contoh";
          const body = split ? split[2] : src;
          elements.push(
            <details
              key={i}
              data-tts-line={i}
              className="group my-4 overflow-hidden rounded-lg border-l-4 border-primary/40 bg-muted/40 transition-colors duration-300"
            >
              <summary className="flex cursor-pointer select-none items-center gap-2 px-4 py-2.5 text-sm font-semibold text-foreground/90">
                <svg
                  className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-open:rotate-90"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
                {parseInline(label)}
              </summary>
              {body ? (
                <p className="px-4 pb-3 text-base leading-7 text-foreground/90">
                  {parseInline(body)}
                </p>
              ) : null}
            </details>
          );
        } else {
          elements.push(
            <p
              key={i}
              data-tts-line={i}
              className="text-base leading-7 my-3 transition-colors duration-300 rounded"
            >
              {parsed.content}
            </p>
          );
        }
      }
    }
  }

  return <>{elements}</>;
}
