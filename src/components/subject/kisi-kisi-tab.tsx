"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";
import type { KisiKisiItem } from "@/types";
import { BookmarkButton } from "@/components/shared/bookmark-button";

interface KisiKisiTabProps {
  items: KisiKisiItem[];
  note?: string;
  subjectId: string;
}

export function KisiKisiTab({ items, note, subjectId }: KisiKisiTabProps) {
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(items.map((i) => i.topic))
  );

  // Block copy/paste shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        ["c", "u", "p", "s"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const toggle = (topic: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) {
        next.delete(topic);
      } else {
        next.add(topic);
      }
      return next;
    });
  };

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Kisi-kisi belum tersedia untuk mata kuliah ini.
      </p>
    );
  }

  return (
    <div
      className="copy-protected flex flex-col gap-3 py-4"
      onContextMenu={(e) => e.preventDefault()}
    >
      {note && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-2 text-xs text-primary">
          {note}
        </div>
      )}

      {items.map((item) => {
        const isExpanded = expanded.has(item.topic);
        return (
          <div
            key={item.topic}
            className="relative rounded-xl border border-border bg-card overflow-hidden"
          >
            {/* Topic header */}
            <button
              onClick={() => toggle(item.topic)}
              className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-muted/50 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className="font-heading text-base font-semibold flex-1">
                {item.topic}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {item.items.length} item
              </span>
            </button>
            <div className="absolute right-2 top-2">
              <BookmarkButton
                item={{
                  id: `kisi-${subjectId}-${item.topic}`,
                  type: "kisi-kisi",
                  subjectId,
                  title: item.topic,
                }}
              />
            </div>

            {/* Items */}
            {isExpanded && (
              <div className="border-t border-border px-4 py-2">
                {item.items.map((subItem, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 py-2"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-primary/40 shrink-0" />
                    <span className="text-sm text-foreground/80">
                      {subItem}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
