import type { CommentAnchor } from "@/lib/comments";

/**
 * Put comment marks on the rendered Rangkuman: a dotted underline on each
 * commented passage, clickable to open its thread.
 *
 * The same anchoring as highlights (applyHighlightsToDOM): the stored line +
 * offsets first, and when the module was edited and those no longer frame the
 * quoted text, a search for that exact text on the original line and then on
 * any line. Exact text only, never a guess. A thread whose text is gone is
 * simply not placed, and the caller lists it as "teks sudah berubah": it never
 * disappears.
 *
 * Returns the ids that were placed.
 */
export function applyCommentsToDOM(
  container: HTMLElement,
  roots: { id: string; anchor: CommentAnchor | null; resolved: boolean }[],
  onClick: (id: string) => void
): Set<string> {
  container.querySelectorAll("mark.hs-comment").forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parent.normalize();
  });

  const lineEls = Array.from(container.querySelectorAll<HTMLElement>("[data-tts-line]"));
  const byIndex = new Map<number, HTMLElement>();
  for (const el of lineEls) {
    const n = parseInt(el.getAttribute("data-tts-line") ?? "", 10);
    if (!Number.isNaN(n)) byIndex.set(n, el);
  }

  const placed = new Set<string>();
  for (const r of roots) {
    // A resolved thread keeps its place in the panel but not in the text,
    // the way a document hides comments that are done.
    if (!r.anchor || r.resolved) continue;
    const wanted = r.anchor.text.trim();
    if (!wanted) continue;
    const primary = byIndex.get(r.anchor.line) ?? null;

    if (primary) {
      const text = primary.textContent ?? "";
      const s = Math.max(0, Math.min(r.anchor.start, text.length));
      const e = Math.max(s, Math.min(r.anchor.end, text.length));
      if (e > s && text.slice(s, e).trim() === wanted) {
        wrap(primary, s, e, r.id, onClick);
        placed.add(r.id);
        continue;
      }
    }
    const order = primary ? [primary, ...lineEls.filter((el) => el !== primary)] : lineEls;
    for (const el of order) {
      const idx = (el.textContent ?? "").indexOf(wanted);
      if (idx !== -1) {
        wrap(el, idx, idx + wanted.length, r.id, onClick);
        placed.add(r.id);
        break;
      }
    }
  }
  return placed;
}

/**
 * Scroll a placed thread's passage into view and flash it. `block: "start"`
 * on a phone, where the open comments sheet covers the lower half.
 */
export function revealComment(container: HTMLElement, id: string, block: ScrollLogicalPosition = "center"): boolean {
  const marks = container.querySelectorAll<HTMLElement>(`mark.hs-comment[data-comment-id="${CSS.escape(id)}"]`);
  if (!marks.length) return false;
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  marks[0].scrollIntoView({ behavior: still ? "auto" : "smooth", block });
  marks.forEach((m) => {
    m.classList.remove("hs-comment-flash");
    void m.offsetWidth; // restart the animation
    m.classList.add("hs-comment-flash");
  });
  return true;
}

/** Mark the open thread's passage so it stands out from the other comments. */
export function setActiveComment(container: HTMLElement, id: string | null) {
  container.querySelectorAll<HTMLElement>("mark.hs-comment").forEach((m) => {
    if (id && m.dataset.commentId === id) m.dataset.active = "true";
    else delete m.dataset.active;
  });
}

function wrap(lineEl: HTMLElement, start: number, end: number, id: string, onClick: (id: string) => void) {
  const walker = document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT);
  const segments: { node: Text; from: number; to: number }[] = [];
  let pos = 0;
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const node = n as Text;
    const len = node.textContent?.length ?? 0;
    const lo = Math.max(start, pos);
    const hi = Math.min(end, pos + len);
    if (lo < hi) segments.push({ node, from: lo - pos, to: hi - pos });
    pos += len;
    if (pos >= end) break;
  }
  for (const seg of segments) {
    try {
      const range = document.createRange();
      range.setStart(seg.node, seg.from);
      range.setEnd(seg.node, seg.to);
      const mark = document.createElement("mark");
      mark.className = "hs-comment";
      mark.dataset.commentId = id;
      mark.addEventListener("click", (e) => {
        e.stopPropagation();
        onClick(id);
      });
      range.surroundContents(mark);
    } catch {
      // A boundary edge case: skip this segment rather than throw.
    }
  }
}
