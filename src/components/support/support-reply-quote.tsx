"use client";

import { Reply } from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";

interface Props {
  replyToName: string | null;
  replyToContent: string | null;
  /** Click handler - typically scrolls to original message. */
  onClick?: () => void;
  /** Whether the original is gone (deleted/missing). */
  isMissing?: boolean;
}

/**
 * Quote block rendered inside a bubble that is a reply to another message.
 * Click → scroll to original (handled by parent).
 */
export function SupportReplyQuote({
  replyToName,
  replyToContent,
  onClick,
  isMissing,
}: Props) {
  const { t } = useTranslation();
  if (!replyToName) return null;

  let preview: string;
  if (isMissing) {
    preview = `(${t("support.message_deleted")})`;
  } else if (!replyToContent) {
    preview = t("support.image_label");
  } else if (replyToContent.startsWith("[image]")) {
    // Strip legacy image hint from preview
    const after = replyToContent.split("\n").slice(1).join("\n");
    preview = after || t("support.image_label");
  } else {
    preview = replyToContent;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-1 flex w-full min-w-0 max-w-full items-center gap-1.5 overflow-hidden rounded-md border-l-2 border-primary/60 bg-background/40 px-2 py-1 text-left text-[11px] text-muted-foreground transition-colors hover:bg-background/60"
    >
      <Reply className="h-3 w-3 shrink-0 text-primary/70" />
      <span className="shrink-0 font-semibold text-foreground">{replyToName}</span>
      <span className="min-w-0 flex-1 truncate">{preview.slice(0, 80)}</span>
    </button>
  );
}
