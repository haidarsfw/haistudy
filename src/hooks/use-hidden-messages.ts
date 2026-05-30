"use client";

import { useCallback, useEffect, useState } from "react";

const HIDDEN_CAP = 1000;

/**
 * localStorage-backed Set of "hidden message IDs" per scope key.
 * Used by support chat to support "Hapus untuk saya" - the server still has
 * the row; this just hides it locally on the user's device.
 *
 * @param scopeKey unique key (typically license_key); null disables.
 */
export function useHiddenMessages(scopeKey: string | null) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  // Load on key change
  useEffect(() => {
    if (!scopeKey || typeof window === "undefined") {
      setHidden(new Set());
      return;
    }
    try {
      const raw = localStorage.getItem(`hs-support-hidden-${scopeKey}`);
      if (!raw) {
        setHidden(new Set());
        return;
      }
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) {
        setHidden(new Set());
        return;
      }
      setHidden(new Set(arr.slice(-HIDDEN_CAP)));
    } catch {
      setHidden(new Set());
    }
  }, [scopeKey]);

  const persist = useCallback(
    (next: Set<string>) => {
      if (!scopeKey || typeof window === "undefined") return;
      try {
        const arr = Array.from(next).slice(-HIDDEN_CAP);
        localStorage.setItem(
          `hs-support-hidden-${scopeKey}`,
          JSON.stringify(arr)
        );
      } catch {
        // ignore quota / parse errors
      }
    },
    [scopeKey]
  );

  const hide = useCallback(
    (id: string) => {
      setHidden((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const unhide = useCallback(
    (id: string) => {
      setHidden((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const isHidden = useCallback((id: string) => hidden.has(id), [hidden]);

  return { hidden, hide, unhide, isHidden };
}
