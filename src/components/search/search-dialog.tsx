"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  FileText,
  Brain,
  ListChecks,
  Search,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { searchContent, type SearchResult } from "@/lib/search";
import { useTranslation } from "@/components/providers/language-provider";
import { sounds } from "@/lib/sounds";
import { useOptionalScope } from "@/components/providers/scope-provider";
import { DEFAULT_SCOPE } from "@/lib/scope";

const typeIcons: Record<SearchResult["type"], typeof BookOpen> = {
  materi: BookOpen,
  rangkuman: FileText,
  "kisi-kisi": ListChecks,
  flashcard: Brain,
};

const typeLabels: Record<SearchResult["type"], string> = {
  materi: "Slides",
  rangkuman: "Rangkuman",
  "kisi-kisi": "Kisi-Kisi",
  flashcard: "Flashcard",
};

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const scopeCtx = useOptionalScope();
  const scope = scopeCtx?.scope ?? DEFAULT_SCOPE;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 480);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Reset state + focus on open - use ref callback for immediate focus
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelected(0);
    }
  }, [open]);

  // Ref callback - fires immediately when the element mounts
  // This preserves the user gesture context chain better than useEffect + setTimeout
  const inputRefCallback = useCallback(
    (el: HTMLInputElement | null) => {
      inputRef.current = el;
      if (el && open) {
        // Use requestAnimationFrame to ensure DOM is painted
        // but still close enough to user gesture for mobile keyboard
        requestAnimationFrame(() => {
          el.focus({ preventScroll: false });
          // Double-tap: some mobile browsers need a second focus after layout
          setTimeout(() => {
            el.focus({ preventScroll: false });
          }, 50);
        });
      }
    },
    [open]
  );

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onOpenChange]);

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      setSelected(0);
      if (value.trim().length >= 2) {
        // Scope-locked: only return results from the current scope's content.
        searchContent(scope, value)
          .then((r) => setResults(r))
          .catch(() => setResults([]));
      } else {
        setResults([]);
      }
    },
    [scope]
  );

  const navigate = useCallback(
    (result: SearchResult) => {
      try { sounds.click(); } catch {}
      onOpenChange(false);
      router.push(result.href);
    },
    [onOpenChange, router]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === "Enter" && results[selected]) {
        e.preventDefault();
        navigate(results[selected]);
      }
    },
    [results, selected, navigate]
  );

  // Scroll selected item into view when using arrow keys
  useEffect(() => {
    if (results.length === 0) return;
    const container = containerRef.current?.querySelector(".overflow-y-auto");
    const selectedEl = container?.querySelector(`[data-index="${selected}"]`);
    selectedEl?.scrollIntoView({ block: "nearest" });
  }, [selected, results.length]);

  return (
    <AnimatePresence>
      {open && (
        <div ref={containerRef} className="relative">
          {/* Inline search input */}
          <motion.div
            initial={{ opacity: 0, width: isMobile ? "calc(100vw - 2rem)" : "16rem" }}
            animate={{ opacity: 1, width: isMobile ? "calc(100vw - 2rem)" : "24rem" }}
            exit={{ opacity: 0, width: isMobile ? "calc(100vw - 2rem)" : "16rem" }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="flex items-center gap-2 rounded-lg border border-primary/30 bg-background px-3 py-1.5 shadow-sm"
          >
            <Search className="h-4 w-4 shrink-0 text-primary" />
            <input
              ref={inputRefCallback}
              type="search"
              inputMode="search"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="search"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("search.placeholder")}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/80"
            />
            {/* Mobile: show explicit close button instead of keyboard shortcut */}
            {isMobile ? (
              <button
                onClick={() => onOpenChange(false)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 text-[10px] text-muted-foreground">
                ESC
              </kbd>
            )}
          </motion.div>

          {/* Dropdown results */}
          {(query.trim().length >= 2 || query.trim().length === 0) && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border bg-background shadow-lg z-50 overflow-hidden w-full min-w-0"
            >
              <div className="max-h-[320px] overflow-y-auto">
                {query.trim().length >= 2 && results.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    {t("search.no_results")} &ldquo;{query}&rdquo;
                  </div>
                )}

                {results.length > 0 && (
                  <ul className="py-1">
                    {results.map((result, i) => {
                      const Icon = typeIcons[result.type];
                      return (
                        <li key={`${result.type}-${result.subjectId}-${result.title}-${i}`} data-index={i}>
                          <button
                            type="button"
                            onClick={() => navigate(result)}
                            onMouseEnter={() => setSelected(i)}
                            className={`flex w-full items-start gap-3 px-4 py-2.5 text-left no-underline transition-colors ${
                              i === selected
                                ? "bg-primary/10 text-foreground"
                                : "text-foreground hover:bg-muted/50"
                            }`}
                          >
                            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-medium">
                                  {result.title}
                                </span>
                                <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                  {typeLabels[result.type]}
                                </span>
                              </div>
                              {result.subtitle && (
                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                  {result.subtitle}
                                </p>
                              )}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {query.trim().length < 2 && (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    {t("search.min_chars")}
                  </div>
                )}
              </div>

              {/* Footer hints */}
              <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-muted px-1">↑↓</kbd> navigasi
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-muted px-1">↵</kbd> buka
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-muted px-1">esc</kbd> tutup
                </span>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
