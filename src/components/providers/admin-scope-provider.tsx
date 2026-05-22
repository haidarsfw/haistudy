"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSession } from "@/components/providers/session-provider";
import {
  AVAILABLE_SCOPES,
  DEFAULT_SCOPE,
  LATEST_SCOPE,
  isAvailableScope,
  parseScopeKey,
  scopeKey,
} from "@/lib/scope";
import type { ScopeTuple } from "@/types/scope";

export type AdminScopeValue = ScopeTuple | "all";

interface AdminScopeContextValue {
  adminScope: AdminScopeValue;
  adminScopeKey: string;          // scopeKey(tuple) or "all"
  isAllPeriods: boolean;
  hydrated: boolean;              // false until localStorage read on mount
  setAdminScope: (s: AdminScopeValue) => void;
  /**
   * Returns URL query suffix for API calls. Examples:
   *   - "" when not hydrated (caller should hold fetches)
   *   - "?scope=s2-uas-bm" when a specific scope is picked
   *   - "?allPeriods=1" when "All periods" is picked
   */
  scopeQuery: () => string;
}

const STORAGE_KEY = "hs-admin-scope";

const AdminScopeContext = createContext<AdminScopeContextValue | null>(null);

function readStoredValue(): AdminScopeValue | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    if (raw === "all") return "all";
    const parsed = parseScopeKey(raw);
    if (parsed && isAvailableScope(parsed)) return parsed;
    // Corrupted / unknown — drop and let caller fall back.
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}

function writeStoredValue(value: AdminScopeValue) {
  if (typeof window === "undefined") return;
  try {
    if (value === "all") {
      window.localStorage.setItem(STORAGE_KEY, "all");
    } else {
      window.localStorage.setItem(STORAGE_KEY, scopeKey(value));
    }
  } catch {
    // localStorage full / disabled — non-fatal.
  }
}

export function AdminScopeProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [adminScope, setAdminScopeState] = useState<AdminScopeValue>(DEFAULT_SCOPE);
  const [hydrated, setHydrated] = useState(false);

  // Hydration order:
  //   localStorage["hs-admin-scope"]  (set by login-form on fresh login;
  //                                    persists across reloads within session)
  //   → LATEST_SCOPE                  (admins default here when nothing stored —
  //                                    matches the "always land on latest" policy)
  //   → session.scope                 (non-admin fallback; admins skip this)
  //   → DEFAULT_SCOPE
  useEffect(() => {
    const stored = readStoredValue();
    if (stored) {
      setAdminScopeState(stored);
    } else if (session?.isAdmin) {
      setAdminScopeState(LATEST_SCOPE);
    } else if (session?.scope && isAvailableScope(session.scope)) {
      setAdminScopeState(session.scope);
    } else {
      setAdminScopeState(DEFAULT_SCOPE);
    }
    setHydrated(true);
    // Run once on mount (don't re-hydrate on every session refresh).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setAdminScope = useCallback((s: AdminScopeValue) => {
    setAdminScopeState(s);
    writeStoredValue(s);
  }, []);

  const value = useMemo<AdminScopeContextValue>(() => {
    const isAllPeriods = adminScope === "all";
    const adminScopeKey = isAllPeriods ? "all" : scopeKey(adminScope);
    const scopeQuery = () => {
      if (!hydrated) return "";
      if (isAllPeriods) return "?allPeriods=1";
      return `?scope=${scopeKey(adminScope)}`;
    };
    return {
      adminScope,
      adminScopeKey,
      isAllPeriods,
      hydrated,
      setAdminScope,
      scopeQuery,
    };
  }, [adminScope, hydrated, setAdminScope]);

  return (
    <AdminScopeContext.Provider value={value}>
      {children}
    </AdminScopeContext.Provider>
  );
}

export function useAdminScope(): AdminScopeContextValue {
  const ctx = useContext(AdminScopeContext);
  if (!ctx) {
    throw new Error("useAdminScope must be used inside <AdminScopeProvider>");
  }
  return ctx;
}

export { AVAILABLE_SCOPES };
