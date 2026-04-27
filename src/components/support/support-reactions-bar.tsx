"use client";

import { useMemo } from "react";
import type { SupportReaction } from "@/types";

interface Props {
  reactions: SupportReaction[];
  /** License key of the current user — used to mark "active" chips. */
  myKey: string | null;
  onToggle: (emoji: string) => void;
  isInflight: (emoji: string) => boolean;
  /** Compact alignment under bubble. */
  align?: "start" | "end";
}

interface Group {
  emoji: string;
  count: number;
  byMe: boolean;
  reactors: string[];
}

/**
 * Chip row of reaction emojis with counts, displayed under a bubble.
 * Tap chip → toggle that reaction by current user.
 */
export function SupportReactionsBar({
  reactions,
  myKey,
  onToggle,
  isInflight,
  align = "start",
}: Props) {
  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>();
    for (const r of reactions) {
      const cur = map.get(r.emoji) ?? {
        emoji: r.emoji,
        count: 0,
        byMe: false,
        reactors: [],
      };
      cur.count += 1;
      if (myKey && r.reactorKey === myKey) cur.byMe = true;
      cur.reactors.push(r.reactorName);
      map.set(r.emoji, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [reactions, myKey]);

  if (groups.length === 0) return null;

  return (
    <div
      className={`mt-1 flex flex-wrap gap-1 ${
        align === "end" ? "justify-end" : "justify-start"
      }`}
    >
      {groups.map((g) => {
        const inflight = isInflight(g.emoji);
        return (
          <button
            key={g.emoji}
            onClick={() => onToggle(g.emoji)}
            disabled={inflight}
            title={g.reactors.join(", ")}
            className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px] transition-all ${
              g.byMe
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border bg-background/60 text-foreground hover:bg-muted"
            } ${inflight ? "opacity-60" : ""}`}
          >
            <span className="leading-none">{g.emoji}</span>
            <span className="font-medium">{g.count}</span>
          </button>
        );
      })}
    </div>
  );
}
