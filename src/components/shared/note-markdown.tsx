"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

/**
 * Renders a note as Markdown + LaTeX/KaTeX.
 * - **bold**, *italic*, lists, headings, links, code, blockquote (remark-gfm)
 * - inline `$x^2$` and block `$$...$$` math (remark-math + rehype-katex)
 *
 * Notes are PRIVATE (only the author reads them) and react-markdown does NOT
 * render raw HTML by default (no rehype-raw), so this is XSS-safe without an
 * extra sanitizer. Element styling is inline (no dependency on a typography
 * plugin) so bullets/headings/etc. survive Tailwind preflight.
 */
export function NoteMarkdown({ content }: { content: string }) {
  if (!content.trim()) {
    return (
      <p className="text-sm italic text-muted-foreground">Belum ada catatan.</p>
    );
  }
  return (
    <div
      className="break-words text-sm leading-relaxed space-y-2 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em] [&_em]:italic [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold [&_hr]:my-3 [&_hr]:border-border [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_strong]:font-semibold [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_ul]:list-disc [&_ul]:pl-5 [&_.katex-display]:overflow-x-auto"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
