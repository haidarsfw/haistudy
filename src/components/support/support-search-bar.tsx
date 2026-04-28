"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/providers/language-provider";
import type { SupportSearchHit } from "@/types";

interface Props {
  open: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  hits: SupportSearchHit[];
  loading: boolean;
  onClose: () => void;
  onJump: (messageId: string) => void;
}

function formatHitTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function highlightSnippet(content: string, query: string): {
  before: string;
  match: string;
  after: string;
} {
  const lower = content.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx < 0) {
    return { before: content.slice(0, 80), match: "", after: "" };
  }
  const start = Math.max(0, idx - 24);
  const end = Math.min(content.length, idx + q.length + 56);
  return {
    before: (start > 0 ? "…" : "") + content.slice(start, idx),
    match: content.slice(idx, idx + q.length),
    after: content.slice(idx + q.length, end) + (end < content.length ? "…" : ""),
  };
}

export function SupportSearchBar({
  open,
  query,
  onQueryChange,
  hits,
  loading,
  onClose,
  onJump,
}: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Esc closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute left-0 right-0 top-0 z-30 border-b border-border bg-background shadow-lg"
        >
          <div className="flex items-center gap-2 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={t("support.search_placeholder")}
              className="flex-1 bg-transparent text-sm focus:outline-none"
              maxLength={80}
            />
            {loading && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {query.trim().length > 0 && (
            <div className="max-h-[280px] overflow-y-auto border-t border-border">
              {hits.length === 0 && !loading ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  {t("support.search_no_results")}
                </p>
              ) : (
                hits.map((h) => {
                  const snip = highlightSnippet(h.content, query.trim());
                  return (
                    <button
                      key={h.messageId}
                      onClick={() => onJump(h.messageId)}
                      className="block w-full border-b border-border/40 px-3 py-2 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                        <span className="font-medium">
                          {h.senderName}
                          {h.isAdmin ? " (Admin)" : ""}
                        </span>
                        <span>{formatHitTime(h.createdAt)}</span>
                      </div>
                      <p className="mt-0.5 break-words text-xs">
                        {snip.before}
                        <mark className="bg-amber-300/60 text-foreground dark:bg-amber-400/40">
                          {snip.match}
                        </mark>
                        {snip.after}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
