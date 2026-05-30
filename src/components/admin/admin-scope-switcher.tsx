"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import { useSession } from "@/components/providers/session-provider";
import { useOptionalScope } from "@/components/providers/scope-provider";
import { AVAILABLE_SCOPES, scopeKey, scopePath, examLabel } from "@/lib/scope";
import type { ScopeTuple } from "@/types/scope";
import { sounds } from "@/lib/sounds";

/** Compact label for dropdown items: "S2 · UTS · BM" */
function scopeCompact(s: ScopeTuple): string {
  return `S${s.semester} · ${examLabel(s)} · ${s.jurusan.toUpperCase()}`;
}

/**
 * Admin-only scope switcher - shows a dropdown of available scopes.
 * Hitting "switch" calls /api/auth/switch-scope to update the cookie,
 * then navigates to the new scope's dashboard.
 */
export function AdminScopeSwitcher({ collapsed }: { collapsed: boolean }) {
  const { session, updateSession } = useSession();
  const scopeCtx = useOptionalScope();
  const currentScopeKey = scopeCtx ? scopeKey(scopeCtx.scope) : null;
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleSwitch = useCallback(
    async (target: ScopeTuple) => {
      const targetKey = scopeKey(target);
      if (targetKey === currentScopeKey) {
        setIsOpen(false);
        return;
      }

      setSwitching(true);
      sounds.click();

      try {
        const res = await fetch("/api/auth/switch-scope", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scopeKey: targetKey }),
        });

        if (!res.ok) {
          console.error("Switch scope failed:", await res.text());
          return;
        }

        const data = await res.json();

        // Update session scope client-side so ScopeProvider doesn't mismatch
        updateSession({ scope: target, scopeKey: targetKey });

        // Navigate to the new scope's dashboard
        router.push(data.redirectTo || `/${scopePath(target)}/dashboard`);
        setIsOpen(false);
      } catch (err) {
        console.error("Switch scope error:", err);
      } finally {
        setSwitching(false);
      }
    },
    [currentScopeKey, router, updateSession]
  );

  if (!session?.isAdmin) return null;

  // Collapsed sidebar - just show icon
  if (collapsed) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full justify-center rounded-lg py-2 text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
          title="Switch Scope"
        >
          <ArrowRightLeft className="h-4 w-4" />
        </button>
        {isOpen && (
          <div className="absolute left-full top-0 ml-2 w-40 rounded-lg border border-border bg-popover p-1 shadow-lg z-50 animate-in fade-in slide-in-from-left-2 duration-150">
            <ScopeDropdownContent
              currentScopeKey={currentScopeKey}
              switching={switching}
              onSwitch={handleSwitch}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => { sounds.click(); setIsOpen(!isOpen); }}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
      >
        <ArrowRightLeft className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">
          {scopeCtx ? scopeCompact(scopeCtx.scope) : "Switch"}
        </span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-border bg-popover p-1 shadow-lg z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <ScopeDropdownContent
            currentScopeKey={currentScopeKey}
            switching={switching}
            onSwitch={handleSwitch}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Shared dropdown content for both sidebar and mobile.
 * Uses short labels: "S2 · UTS", "S2 · UAS".
 */
export function ScopeDropdownContent({
  currentScopeKey,
  switching,
  onSwitch,
}: {
  currentScopeKey: string | null;
  switching: boolean;
  onSwitch: (s: ScopeTuple) => void;
}) {
  return (
    <>
      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Switch Scope
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
    </>
  );
}

/**
 * Mobile scope switcher - inline in the "More" sheet.
 * Uses the same switch logic but different layout.
 */
export function MobileScopeSwitcher() {
  const { session, updateSession } = useSession();
  const scopeCtx = useOptionalScope();
  const currentScopeKey = scopeCtx ? scopeKey(scopeCtx.scope) : null;
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  const handleSwitch = useCallback(
    async (target: ScopeTuple) => {
      const targetKey = scopeKey(target);
      if (targetKey === currentScopeKey) return;

      setSwitching(true);
      sounds.click();

      try {
        const res = await fetch("/api/auth/switch-scope", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scopeKey: targetKey }),
        });

        if (!res.ok) return;

        const data = await res.json();
        updateSession({ scope: target, scopeKey: targetKey });
        router.push(data.redirectTo || `/${scopePath(target)}/dashboard`);
      } catch (err) {
        console.error("Switch scope error:", err);
      } finally {
        setSwitching(false);
      }
    },
    [currentScopeKey, router, updateSession]
  );

  if (!session?.isAdmin) return null;

  return (
    <div className="px-2 pb-1">
      <div className="rounded-lg border border-border/50 bg-muted/30 p-2">
        <div className="flex items-center gap-2 px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <ArrowRightLeft className="h-3 w-3" />
          Switch Scope
        </div>
        <div className="space-y-0.5">
          {AVAILABLE_SCOPES.map((s) => {
            const key = scopeKey(s);
            const isActive = key === currentScopeKey;
            return (
              <button
                key={key}
                disabled={switching}
                onClick={() => handleSwitch(s)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-muted"
                } ${switching ? "opacity-50 cursor-wait" : ""}`}
              >
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${
                    isActive ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                />
                <span>{scopeCompact(s)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
