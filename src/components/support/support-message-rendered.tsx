"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { autoLinkUrls } from "@/lib/support/auto-link";

interface Props {
  content: string;
}

// Strict sanitize schema. defaultSchema already blocks <script>, <iframe>,
// event handlers, javascript: URLs, etc. We force `target=_blank` + safe
// rel on links.
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...((defaultSchema.attributes?.a ?? []) as Array<unknown>),
      ["target"],
      ["rel"],
    ],
  },
};

/**
 * Render message content with markdown + GFM (tables/strikethrough) and auto-
 * linked URLs. All output sanitized via rehype-sanitize. URLs starting with
 * unsafe schemes (javascript:, data:) are stripped by defaultSchema.
 */
export function SupportMessageRendered({ content }: Props) {
  const linkified = autoLinkUrls(content);
  return (
    <div className="markdown-body break-words text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, schema]]}
        components={{
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-primary underline underline-offset-2"
              {...props}
            >
              {children}
            </a>
          ),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          code: ({ inline, children, ...props }: any) =>
            inline ? (
              <code
                className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-[0.9em]"
                {...props}
              >
                {children}
              </code>
            ) : (
              <pre className="my-1 overflow-x-auto rounded bg-foreground/10 p-2 font-mono text-[0.85em]">
                <code {...props}>{children}</code>
              </pre>
            ),
          p: ({ children }) => (
            <p className="my-0 whitespace-pre-wrap">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="my-1 list-disc pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-1 list-decimal pl-5">{children}</ol>
          ),
          li: ({ children }) => <li className="my-0.5">{children}</li>,
          h1: ({ children }) => (
            <h1 className="my-1 text-base font-bold">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="my-1 text-sm font-bold">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="my-1 text-sm font-semibold">{children}</h3>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-1 border-l-2 border-foreground/30 pl-2 italic opacity-90">
              {children}
            </blockquote>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          hr: () => <hr className="my-2 border-foreground/20" />,
          // Block raw HTML images entirely - only allow URL-form via
          // sanitize schema; markdown-syntax images would be allowed but
          // we want to avoid layout chaos. Strip <img> from output.
          img: () => null,
        }}
      >
        {linkified}
      </ReactMarkdown>
    </div>
  );
}
