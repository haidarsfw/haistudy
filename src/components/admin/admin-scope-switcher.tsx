"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, ChevronDown, GraduationCap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "@/components/providers/session-provider";
import { useOptionalScope } from "@/components/providers/scope-provider";
import { AVAILABLE_SCOPES, scopeKey, scopePath, examLabel, jurusanLabel } from "@/lib/scope";
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
 * Mobile scope card - rendered in the "More" sheet for every user. Shows the
 * current scope; admins get a chevron that expands the switchable-scope list
 * (collapsed by default).
 */
export function MobileScopeSwitcher() {
  const { session, updateSession } = useSession();
  const scopeCtx = useOptionalScope();
  const currentScopeKey = scopeCtx ? scopeKey(scopeCtx.scope) : null;
  const router = useRouter();
  const [switching, setSwitching] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isAdmin = !!session?.isAdmin;

  const handleSwitch = useCallback(
    async (target: ScopeTuple) => {
      const targetKey = scopeKey(target);
      if (targetKey === currentScopeKey) {
        setExpanded(false);
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

  if (!scopeCtx) return null;
  const scope = scopeCtx.scope;

  return (
    <div className="px-4 pt-3 pb-1">
      <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/30">
        {/* Current scope — tappable toggle for admins */}
        <button
          type="button"
          onClick={isAdmin ? () => { sounds.click(); setExpanded((e) => !e); } : undefined}
          aria-expanded={isAdmin ? expanded : undefined}
          className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${
            isAdmin
              ? "hs-press cursor-pointer transition-colors hover:bg-muted/50"
              : "cursor-default"
          }`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <GraduationCap className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Scope Aktif
            </span>
            <span className="block truncate text-sm font-semibold text-foreground">
              Semester {scope.semester} · {examLabel(scope)}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {jurusanLabel(scope)}
            </span>
          </span>
          {isAdmin && (
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                expanded ? "rotate-180" : ""
              }`}
            />
          )}
        </button>

        {/* Switchable scopes — admin only, collapsed by default */}
        {isAdmin && (
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden border-t border-border/60"
              >
                <div className="space-y-0.5 p-1.5">
                  {AVAILABLE_SCOPES.map((s) => {
                    const key = scopeKey(s);
                    const isActive = key === currentScopeKey;
                    return (
                      <button
                        key={key}
                        disabled={switching}
                        onClick={() => handleSwitch(s)}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                          isActive
                            ? "bg-primary/10 font-semibold text-primary"
                            : "text-foreground hover:bg-muted"
                        } ${switching ? "cursor-wait opacity-50" : ""}`}
                      >
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            isActive ? "bg-primary" : "bg-muted-foreground/30"
                          }`}
                        />
                        <span className="truncate">{scopeCompact(s)}</span>
                        {isActive && (
                          <span className="ml-auto text-[10px] font-medium text-primary/70">
                            Aktif
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
