"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers/session-provider";
import type { ScopeTuple, ScopeKey, ScopePath } from "@/types/scope";
import { scopeKey as toScopeKey, scopePath as toScopePath, eqScope } from "@/lib/scope";

interface ScopeContextValue {
  scope: ScopeTuple;
  scopeKey: ScopeKey;
  scopePath: ScopePath;
  isMismatched: boolean;
}

const ScopeContext = createContext<ScopeContextValue | null>(null);

export function ScopeProvider({
  scope,
  children,
}: {
  scope: ScopeTuple;
  children: React.ReactNode;
}) {
  const { session } = useSession();
  const router = useRouter();
  const [isMismatched, setIsMismatched] = useState(false);

  const value = useMemo<ScopeContextValue>(
    () => ({
      scope,
      scopeKey: toScopeKey(scope),
      scopePath: toScopePath(scope),
      isMismatched,
    }),
    [scope, isMismatched]
  );

  // Detect URL-vs-session scope mismatch. If a NON-admin user opens a scoped
  // URL whose tuple doesn't match their license's bound scope, redirect after 3s.
  // Admin users are exempt - they can freely switch between any available scope.
  useEffect(() => {
    if (!session) return;
    if (!session.scope) return;
    const mismatch = !eqScope(session.scope, scope);
    setIsMismatched(mismatch);
    if (!mismatch || session.isAdmin) return;

    const timer = setTimeout(() => {
      router.replace(`/${toScopePath(session.scope)}/dashboard`);
    }, 3000);
    return () => clearTimeout(timer);
  }, [session, scope, router]);

  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>;
}

export function useScope(): ScopeContextValue {
  const ctx = useContext(ScopeContext);
  if (!ctx) {
    throw new Error("useScope must be used inside <ScopeProvider>");
  }
  return ctx;
}

/**
 * Optional reader for components that need to behave gracefully outside
 * the (scoped) tree (e.g. landing pages, admin shell).
 */
export function useOptionalScope(): ScopeContextValue | null {
  return useContext(ScopeContext);
}
