/**
 * Convert Markdown to clean, readable plain text for chat exports (TXT/PDF).
 *
 * Goal: remove formatting noise (`**`, `*`, `_`, `#`, backticks, links, math
 * delimiters) while KEEPING the wording, line breaks, list structure, and
 * paragraph spacing intact, so an exported transcript reads naturally instead
 * of looking like raw Markdown. Pure string function, no dependencies.
 */
export function stripMarkdown(md: string): string {
  if (!md) return "";
  let text = md.replace(/\r\n/g, "\n");

  // Fenced code blocks: keep the inner code, drop the ``` fences.
  text = text.replace(/```[a-zA-Z0-9]*\n?([\s\S]*?)```/g, (_m, code: string) =>
    code.replace(/\n$/, "")
  );

  // Block-level cleanup, line by line.
  text = text
    .split("\n")
    .map((line) => {
      // Horizontal rules (---, ***, ___, ===) -> blank line.
      if (/^\s*([-*_])\1{2,}\s*$/.test(line) || /^\s*={3,}\s*$/.test(line)) {
        return "";
      }
      let l = line;
      l = l.replace(/^\s{0,3}#{1,6}\s+/, ""); // drop heading markers
      l = l.replace(/^\s{0,3}(?:>\s?)+/, ""); // drop blockquote markers
      l = l.replace(/^(\s*)[*+-]\s+/, "$1- "); // normalize bullets to "- "
      return l;
    })
    .join("\n");

  // Inline cleanup.
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1"); // images -> alt text
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1"); // links -> link text
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1"); // **bold**
  text = text.replace(/__([^_]+)__/g, "$1"); // __bold__
  text = text.replace(/\*([^*\n]+)\*/g, "$1"); // *italic*
  text = text.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?:;]|$)/g, "$1$2"); // _italic_ (not snake_case)
  text = text.replace(/~~([^~]+)~~/g, "$1"); // ~~strikethrough~~
  text = text.replace(/`([^`]+)`/g, "$1"); // `inline code`
  text = text.replace(/\$\$([^$]+)\$\$/g, "$1"); // $$block math$$
  text = text.replace(/\$([^$\n]+)\$/g, "$1"); // $inline math$

  // Keep paragraph spacing but collapse runaway blank lines.
  text = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");

  return text.trim();
}
