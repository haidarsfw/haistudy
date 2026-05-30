"use client";

import { Bookmark, BookmarkX, Trash2, Lock, Sparkles } from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";
import type { HighlightColor, UserHighlight } from "@/types";

// Tooltip swatch preview only. The actual <mark> backgrounds are theme-aware
// CSS classes (hs-hl-<color>) defined in globals.css - dark mode brightens,
// light mode darkens - so a mark stays readable on either reading background.
const COLOR_BG: Record<HighlightColor, string> = {
  yellow: "rgba(250, 204, 21, 0.55)",
  blue: "rgba(96, 165, 250, 0.55)",
  green: "rgba(52, 211, 153, 0.55)",
  pink: "rgba(244, 114, 182, 0.55)",
  red: "rgba(248, 113, 113, 0.6)",
};

// Yellow is free; the rest are VIP-locked.
export const HIGHLIGHT_COLORS: HighlightColor[] = [
  "yellow",
  "blue",
  "green",
  "pink",
  "red",
];

export interface SelectionAnchor {
  text: string;
  ttsLine: number;
  startOffset: number;
  endOffset: number;
  rect: DOMRect;
}

/**
 * Capture the current text selection inside `container` and resolve it to a
 * line-anchored range (data-tts-line index + char offsets within that line).
 * Returns null when there is no usable selection inside the container.
 */
export function computeSelectionAnchor(
  container: HTMLElement
): SelectionAnchor | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0);
  if (!container.contains(range.startContainer)) return null;

  // Walk up to the data-tts-line element the selection starts in.
  let el: Node | null = range.startContainer;
  while (el && el !== container) {
    if (
      el.nodeType === Node.ELEMENT_NODE &&
      (el as HTMLElement).hasAttribute("data-tts-line")
    ) {
      break;
    }
    el = el.parentNode;
  }
  if (!el || el === container || el.nodeType !== Node.ELEMENT_NODE) return null;

  const lineEl = el as HTMLElement;
  const ttsLine = parseInt(lineEl.getAttribute("data-tts-line") ?? "", 10);
  if (Number.isNaN(ttsLine)) return null;

  const lineText = lineEl.textContent ?? "";

  // Char offset = length of text from line start up to the boundary.
  const startRange = document.createRange();
  startRange.setStart(lineEl, 0);
  startRange.setEnd(range.startContainer, range.startOffset);
  const startOffset = startRange.toString().length;

  let endOffset: number;
  if (lineEl.contains(range.endContainer)) {
    const endRange = document.createRange();
    endRange.setStart(lineEl, 0);
    endRange.setEnd(range.endContainer, range.endOffset);
    endOffset = endRange.toString().length;
  } else {
    // Selection crosses past this line - clamp to the line's end.
    endOffset = lineText.length;
  }

  if (endOffset <= startOffset) return null;

  const text = lineText.slice(startOffset, endOffset).trim();
  if (!text) return null;

  return {
    text,
    ttsLine,
    startOffset,
    endOffset,
    rect: range.getBoundingClientRect(),
  };
}

// Wrap [start,end) of a line element's text in <mark> nodes. Handles ranges
// that span multiple text nodes (inline <b>/<i> etc.) by wrapping each
// intersecting text-node segment independently.
function wrapLineRange(
  lineEl: HTMLElement,
  start: number,
  end: number,
  color: HighlightColor,
  id: string,
  onClick: (id: string) => void
) {
  const walker = document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT);
  const segments: { node: Text; from: number; to: number }[] = [];
  let pos = 0;
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const node = n as Text;
    const len = node.textContent?.length ?? 0;
    const nodeStart = pos;
    const nodeEnd = pos + len;
    const lo = Math.max(start, nodeStart);
    const hi = Math.min(end, nodeEnd);
    if (lo < hi) {
      segments.push({ node, from: lo - nodeStart, to: hi - nodeStart });
    }
    pos = nodeEnd;
    if (pos >= end) break;
  }

  // Mutate after collecting (mutating during walk invalidates the walker).
  for (const seg of segments) {
    try {
      const r = document.createRange();
      r.setStart(seg.node, seg.from);
      r.setEnd(seg.node, seg.to);
      const mark = document.createElement("mark");
      mark.className = `hs-highlight hs-hl-${color}`;
      mark.dataset.hlId = id;
      mark.addEventListener("click", (e) => {
        e.stopPropagation();
        onClick(id);
      });
      r.surroundContents(mark);
    } catch {
      // Range boundary edge case - skip this segment rather than throw.
    }
  }
}

/**
 * Re-apply all highlights for a module onto the rendered content. Idempotent:
 * first unwraps any existing marks, then re-wraps from the stored anchors.
 */
export function applyHighlightsToDOM(
  container: HTMLElement,
  highlights: UserHighlight[],
  onClickHighlight: (id: string) => void
) {
  // Unwrap existing marks so re-application is clean.
  container.querySelectorAll("mark.hs-highlight").forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parent.normalize();
  });

  for (const h of highlights) {
    const lineEl = container.querySelector<HTMLElement>(
      `[data-tts-line="${h.ttsLine}"]`
    );
    if (!lineEl) continue;
    const lineLen = (lineEl.textContent ?? "").length;
    const start = Math.max(0, Math.min(h.startOffset, lineLen));
    const end = Math.max(start, Math.min(h.endOffset, lineLen));
    if (end <= start) continue;
    wrapLineRange(lineEl, start, end, h.color, h.id, onClickHighlight);
  }
}

interface HighlightTooltipProps {
  x: number;
  y: number;
  mode: "create" | "manage";
  canVip: boolean;
  onPickColor: (color: HighlightColor) => void;
  onSaveToLibrary: () => void;
  onRemove: () => void;
  onRemoveSnippet?: () => void;
  onAskAI?: () => void;
}

export function HighlightTooltip({
  x,
  y,
  mode,
  canVip,
  onPickColor,
  onSaveToLibrary,
  onRemove,
  onRemoveSnippet,
  onAskAI,
}: HighlightTooltipProps) {
  const { t } = useTranslation();

  // Clamp horizontally so the bar never overflows the viewport.
  const clampedX =
    typeof window !== "undefined"
      ? Math.min(Math.max(x, 90), window.innerWidth - 90)
      : x;

  return (
    <div
      className="fixed z-[120] flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-full border border-border bg-popover px-1.5 py-1 shadow-lg"
      style={{ left: clampedX, top: Math.max(y - 8, 8) }}
      onMouseDown={(e) => e.preventDefault()} // keep the text selection alive
    >
      {mode === "create" &&
        HIGHLIGHT_COLORS.map((color) => {
          const locked = !canVip && color !== "yellow";
          return (
            <button
              key={color}
              onClick={() => {
                if (locked) return;
                onPickColor(color);
              }}
              title={
                locked
                  ? t("highlight.color_locked")
                  : t(`highlight.color_${color}`)
              }
              aria-label={t(`highlight.color_${color}`)}
              className={`relative flex h-6 w-6 items-center justify-center rounded-full transition-transform ${locked ? "cursor-not-allowed opacity-70" : "hover:scale-110"}`}
              style={{ backgroundColor: COLOR_BG[color] }}
            >
              {locked && (
                <Lock className="h-3 w-3 text-foreground/70" aria-hidden="true" />
              )}
            </button>
          );
        })}

      {mode === "manage" && (
        <button
          onClick={onRemove}
          title={t("highlight.remove")}
          aria-label={t("highlight.remove")}
          className="flex h-6 w-6 items-center justify-center rounded-full text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}

      <div className="mx-0.5 h-4 w-px bg-border" />

      {onRemoveSnippet ? (
        <button
          onClick={onRemoveSnippet}
          title={t("highlight.remove_snippet")}
          aria-label={t("highlight.remove_snippet")}
          className="flex h-6 w-6 items-center justify-center rounded-full text-destructive hover:bg-destructive/10"
        >
          <BookmarkX className="h-3.5 w-3.5" />
        </button>
      ) : (
        <button
          onClick={onSaveToLibrary}
          title={t("highlight.save_to_library")}
          aria-label={t("highlight.save_to_library")}
          className="flex h-6 w-6 items-center justify-center rounded-full text-primary hover:bg-primary/10"
        >
          <Bookmark className="h-3.5 w-3.5" />
        </button>
      )}

      {onAskAI && (
        <button
          onClick={onAskAI}
          title={t("rangkuman.ask_ai")}
          aria-label={t("rangkuman.ask_ai")}
          className="flex h-6 items-center justify-center gap-1 rounded-full px-2 text-primary hover:bg-primary/10"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="text-[11px] font-medium">{t("rangkuman.ask_ai")}</span>
        </button>
      )}
    </div>
  );
}
