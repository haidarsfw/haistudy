/**
 * Custom HTML tag parser for rangkuman content.
 * Converts custom markup tags to React elements.
 *
 * Supported tags: <h1>, <h2>, <h3>, <bullet>, <subtitle>, <b>, <i>
 */

import React from "react";

interface ParsedElement {
  type: "h1" | "h2" | "h3" | "bullet" | "subtitle" | "text";
  content: React.ReactNode;
}

function parseInline(text: string): React.ReactNode {
  // Parse <b> and <i> tags within text
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    // Find next <b> or <i>
    const boldMatch = remaining.match(/<b>([\s\S]*?)<\/b>/);
    const italicMatch = remaining.match(/<i>([\s\S]*?)<\/i>/);

    let nextMatch: RegExpMatchArray | null = null;
    let tag: "b" | "i" = "b";

    if (boldMatch && italicMatch) {
      if ((boldMatch.index ?? Infinity) <= (italicMatch.index ?? Infinity)) {
        nextMatch = boldMatch;
        tag = "b";
      } else {
        nextMatch = italicMatch;
        tag = "i";
      }
    } else if (boldMatch) {
      nextMatch = boldMatch;
      tag = "b";
    } else if (italicMatch) {
      nextMatch = italicMatch;
      tag = "i";
    }

    if (!nextMatch || nextMatch.index === undefined) {
      parts.push(remaining);
      break;
    }

    // Text before the match
    if (nextMatch.index > 0) {
      parts.push(remaining.slice(0, nextMatch.index));
    }

    // The styled content
    const innerContent = parseInline(nextMatch[1]);
    if (tag === "b") {
      parts.push(
        <strong key={keyIdx++} className="font-semibold">
          {innerContent}
        </strong>
      );
    } else {
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

function parseLine(line: string): ParsedElement | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Match block-level tags
  const h1 = trimmed.match(/^<h1>([\s\S]*?)<\/h1>$/);
  if (h1) return { type: "h1", content: parseInline(h1[1]) };

  const h2 = trimmed.match(/^<h2>([\s\S]*?)<\/h2>$/);
  if (h2) return { type: "h2", content: parseInline(h2[1]) };

  const h3 = trimmed.match(/^<h3>([\s\S]*?)<\/h3>$/);
  if (h3) return { type: "h3", content: parseInline(h3[1]) };

  const bullet = trimmed.match(/^<bullet>([\s\S]*?)<\/bullet>$/);
  if (bullet) return { type: "bullet", content: parseInline(bullet[1]) };

  const subtitle = trimmed.match(/^<subtitle>([\s\S]*?)<\/subtitle>$/);
  if (subtitle) return { type: "subtitle", content: parseInline(subtitle[1]) };

  // Plain text with possible inline tags
  return { type: "text", content: parseInline(trimmed) };
}

export function parseRangkuman(content: string): React.ReactNode {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const parsed = parseLine(lines[i]);
    if (!parsed) continue;

    switch (parsed.type) {
      case "h1":
        elements.push(
          <h2
            key={i}
            className="font-heading text-xl font-bold mt-6 mb-2 first:mt-0"
          >
            {parsed.content}
          </h2>
        );
        break;
      case "h2":
        elements.push(
          <h3
            key={i}
            className="font-heading text-lg font-semibold mt-4 mb-1.5"
          >
            {parsed.content}
          </h3>
        );
        break;
      case "h3":
        elements.push(
          <h4 key={i} className="font-heading text-base font-medium mt-3 mb-1">
            {parsed.content}
          </h4>
        );
        break;
      case "bullet":
        elements.push(
          <div key={i} className="flex gap-2 my-1 pl-2">
            <span className="text-primary mt-1.5 shrink-0">•</span>
            <span className="text-sm leading-relaxed">{parsed.content}</span>
          </div>
        );
        break;
      case "subtitle":
        elements.push(
          <p
            key={i}
            className="text-sm text-muted-foreground mt-3 italic"
          >
            {parsed.content}
          </p>
        );
        break;
      default:
        elements.push(
          <p key={i} className="text-sm leading-relaxed my-1">
            {parsed.content}
          </p>
        );
    }
  }

  return <>{elements}</>;
}
