"use client";

import { useState } from "react";
import { ChevronDown, Globe, ArrowRightLeft } from "lucide-react";
import { sounds } from "@/lib/sounds";
import { useAdminScope, type AdminScopeValue } from "@/components/providers/admin-scope-provider";
import { scopeKey } from "@/lib/scope";
import { ScopeDropdownContent, scopeCompact } from "./scope-dropdown-content";

/**
 * Sticky bar at the top of the admin shell. Lets admins switch between
 * AVAILABLE_SCOPES + an "All periods" sentinel for cross-scope audit.
 *
 * No navigation, no cookie touch — purely React context + localStorage via
 * AdminScopeProvider.
 */
export function AdminScopeHeader() {
  const { adminScope, isAllPeriods, hydrated, setAdminScope } = useAdminScope();
  const [isOpen, setIsOpen] = useState(false);

  // Avoid SSR mismatch — render thin placeholder until localStorage has been read.
  if (!hydrated) {
    return (
      <div className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md px-4 py-2.5">
        <div className="h-7 w-48 rounded bg-muted/50 animate-pulse" />
      </div>
    );
  }

  const currentScopeKey: string = isAllPeriods ? "all" : scopeKey(adminScope as Exclude<AdminScopeValue, "all">);
  const label =
    isAllPeriods || adminScope === "all"
      ? "All periods (audit)"
      : scopeCompact(adminScope);

  const handleSwitch = (next: AdminScopeValue) => {
    sounds.click();
    setAdminScope(next);
    setIsOpen(false);
  };

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 py-2.5 max-w-7xl mx-auto">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden sm:inline">
          Admin Scope
        </span>

        <div className="relative">
          <button
            onClick={() => {
              sounds.click();
              setIsOpen((v) => !v);
            }}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              isAllPeriods
                ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            {isAllPeriods ? (
              <Globe className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <ArrowRightLeft className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>{label}</span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </button>

          {isOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute left-0 top-full mt-1 w-56 rounded-lg border border-border bg-popover p-1 shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <ScopeDropdownContent
                  currentScopeKey={currentScopeKey}
                  onSwitch={handleSwitch}
                  showAllPeriods
                />
              </div>
            </>
          )}
        </div>

        {isAllPeriods && (
          <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
            Mutation disabled — pilih scope spesifik untuk create/update/delete
          </span>
        )}
      </div>
    </div>
  );
}
