"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/components/providers/session-provider";
import { useOptionalScope } from "@/components/providers/scope-provider";
import {
  getAllProgress,
  saveAllProgress,
  mergeProgress,
  clearLegacyProgress,
} from "@/lib/progress";
import { whenIdle } from "@/lib/defer";
import type { SubjectProgress } from "@/types";

/**
 * Syncs study progress from server (user_settings.progress[scopeKey]) into
 * localStorage on mount, per ACCOUNT and per SCOPE. Ensures the dashboard sees
 * server-synced data on a new device, without leaking one scope's (or one
 * account's) progress into another.
 */
export function useProgressSync() {
  const { session } = useSession();
  const scopeCtx = useOptionalScope();
  const scopeKey = scopeCtx?.scopeKey ?? "";
  const syncedScopes = useRef<Set<string>>(new Set());

  useEffect(() => {
    const licenseKey = session?.licenseKey;
    if (!licenseKey || !scopeKey) return;

    // Sync once per (account, scope) so switching scope pulls the new subtree.
    const cacheKey = `${licenseKey}::${scopeKey}`;
    if (syncedScopes.current.has(cacheKey)) return;
    syncedScopes.current.add(cacheKey);

    // Drop the pre-isolation global "hs-progress" key once (no longer read).
    clearLegacyProgress();

    // Defer the fetch + merge until idle so it stays off the FCP path.
    return whenIdle(() => {
      (async () => {
        try {
          // Identity comes from the hs-session cookie (no licenseKey param).
          const res = await fetch(`/api/settings`);
          const data = await res.json();
          // progress is nested by scope-key on the server — take only this scope.
          const serverScoped = data.settings?.progress?.[scopeKey] as
            | Record<string, SubjectProgress>
            | undefined;

          if (!serverScoped || Object.keys(serverScoped).length === 0) return;

          const local = getAllProgress(licenseKey, scopeKey);
          const merged = mergeProgress(local, serverScoped);
          saveAllProgress(licenseKey, scopeKey, merged);

          // Dispatch event so dashboard widgets can pick up the change
          window.dispatchEvent(new Event("hs-progress-synced"));
        } catch {
          // silent - dashboard will still show local data
        }
      })();
    });
  }, [session?.licenseKey, scopeKey]);
}
