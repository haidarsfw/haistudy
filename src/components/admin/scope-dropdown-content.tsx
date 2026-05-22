"use client";

import type { ScopeTuple } from "@/types/scope";
import { AVAILABLE_SCOPES, examLabel, scopeKey } from "@/lib/scope";

/** Compact label for dropdown items: "S2 · UTS · BM" */
export function scopeCompact(s: ScopeTuple): string {
  return `S${s.semester} · ${examLabel(s)} · ${s.jurusan.toUpperCase()}`;
}

/**
 * Shared dropdown markup used by both AdminScopeSwitcher (sidebar, session-scope)
 * and AdminScopeHeader (admin panel, admin-only). The latter passes
 * `showAllPeriods` to render the extra sentinel row at the bottom.
 */
export function ScopeDropdownContent({
  currentScopeKey,
  switching = false,
  onSwitch,
  showAllPeriods = false,
}: {
  currentScopeKey: string | null;
  switching?: boolean;
  onSwitch: (s: ScopeTuple | "all") => void;
  showAllPeriods?: boolean;
}) {
  return (
    <>
      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Pilih Scope
      </div>
      {AVAILABLE_SCOPES.map((s) => {
        const key = scopeKey(s);
        const isActive = key === currentScopeKey;
        return (
          <button
            key={key}
            disabled={switching}
            onClick={() => onSwitch(s)}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
              isActive
                ? "bg-primary/10 text-primary font-semibold"
                : "text-popover-foreground hover:bg-accent"
            } ${switching ? "opacity-50 cursor-wait" : ""}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                isActive ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            />
            <span>{scopeCompact(s)}</span>
          </button>
        );
      })}
      {showAllPeriods && (
        <>
          <div className="my-1 border-t border-border" />
          <button
            disabled={switching}
            onClick={() => onSwitch("all")}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
              currentScopeKey === "all"
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                : "text-popover-foreground hover:bg-accent"
            } ${switching ? "opacity-50 cursor-wait" : ""}`}
            title="Lihat data lintas semua periode (read-only audit)"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                currentScopeKey === "all" ? "bg-amber-500" : "bg-muted-foreground/30"
              }`}
            />
            <span>All periods (audit)</span>
          </button>
        </>
      )}
    </>
  );
}
