"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

/**
 * Markdown + LaTeX renderer for exam content (questions, scenarios, reference
 * answers, cheat sheets).
 *
 * - GFM tables, lists, bold/italic, code (remark-gfm)
 * - block math `$$...$$` and inline math `\(...\)`/`\[...\]` via KaTeX
 *
 * `singleDollarTextMath: false` is the key difference from NoteMarkdown:
 * accounting/ops-mgmt content is full of currency like `$40,000` and
 * `Rp200.000.000`. With single-dollar math enabled those would be parsed as
 * math delimiters and garble the text. So write display formulas with `$$...$$`
 * (or `\[...\]`) and leave `$` money as plain text.
 *
 * Content is author-controlled (in-repo data files), and react-markdown does
 * NOT render raw HTML without rehype-raw, so this is XSS-safe without an extra
 * sanitizer. Element styling is inline so it survives Tailwind preflight.
 */
export function ExamMarkdown({
  content,
  className = "",
  inlineMath = false,
}: {
  content: string;
  className?: string;
  /**
   * Allow single-dollar `$...$` inline math. OFF by default so currency like
   * `$40,000` stays literal text. Turn ON for math-heavy, money-free content
   * (e.g. the ops-mgmt cheat sheet) so inline formulas render via KaTeX.
   */
  inlineMath?: boolean;
}) {
  return (
    <div
      className={
        "exam-md break-words leading-relaxed space-y-2 " +
        "[&_a]:text-primary [&_a]:underline " +
        "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground " +
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em] " +
        "[&_em]:italic [&_strong]:font-semibold " +
        "[&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold " +
        "[&_hr]:my-3 [&_hr]:border-border " +
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 " +
        "[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 " +
        // Tables: scrollable wrapper so wide accounting/ops tables never overflow
        "[&_table]:my-2 [&_table]:block [&_table]:w-max [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_table]:text-sm " +
        "[&_th]:border [&_th]:border-border [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_th]:bg-muted/40 " +
        "[&_td]:border [&_td]:border-border [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:align-top " +
        // KaTeX display blocks: allow horizontal scroll on narrow screens
        "[&_.katex-display]:my-2 [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:py-1 " +
        className
      }
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: inlineMath }]]}
        rehypePlugins={[rehypeKatex]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
