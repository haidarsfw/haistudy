"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "@/types";
import {
  getStoredSession,
  storeSession,
  clearStoredSession,
} from "@/lib/auth/session";

interface SessionContextValue {
  session: Session | null;
  isLoading: boolean;
  login: (session: Session) => void;
  logout: () => void;
  updateSession: (updates: Partial<Session>) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount for instant paint, then ALWAYS
  // reconcile against /api/auth/me. The hs-session cookie is httpOnly (JS can't
  // read it) and is the source of truth: after a Google login the OAuth callback
  // sets the real cookie but cannot touch localStorage, so a stale PREVIEW (or
  // any other) session left here would otherwise win and trap the user in
  // preview mode. If empty, hydrate from the server (401 = no cookie).
  useEffect(() => {
    let cancelled = false;

    const applyEmbeddedSettings = (
      settings:
        | { darkMode?: boolean; theme?: string; font?: string; darkModeSchedule?: unknown }
        | null
        | undefined
    ) => {
      if (!settings) return;
      try {
        if (settings.darkMode !== undefined) {
          localStorage.setItem("dark", JSON.stringify(settings.darkMode));
        }
        if (settings.theme) localStorage.setItem("theme", JSON.stringify(settings.theme));
        if (settings.font) localStorage.setItem("font", JSON.stringify(settings.font));
        if (settings.darkModeSchedule) {
          localStorage.setItem(
            "darkModeSchedule",
            JSON.stringify(settings.darkModeSchedule)
          );
        }
      } catch {
        /* localStorage unavailable */
      }
    };

    const stored = getStoredSession();
    if (stored) {
      setSession(stored);
      setIsLoading(false);
      // Background reconcile: if the cookie names a different account / preview
      // flag / scope than localStorage, the server wins (fixes "stuck in preview"
      // after Google login without needing a logout).
      (async () => {
        try {
          const res = await fetch("/api/auth/me", { credentials: "same-origin" });
          if (!res.ok || cancelled) return;
          const data = await res.json();
          const srv = data.session as Session | undefined;
          if (!srv || cancelled) return;
          if (
            srv.licenseKey !== stored.licenseKey ||
            !!srv.isPreview !== !!stored.isPreview ||
            srv.scopeKey !== stored.scopeKey ||
            srv.loginMethod !== stored.loginMethod
          ) {
            applyEmbeddedSettings(data.settings);
            setSession(srv);
            storeSession(srv);
          }
        } catch {
          /* keep stored session on network error */
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "same-origin" });
        if (!res.ok) {
          if (!cancelled) setIsLoading(false);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        if (data.session) {
          applyEmbeddedSettings(data.settings);
          setSession(data.session);
          storeSession(data.session);
        }
      } catch {
        /* network error - leave session null, AppShell will redirect to / */
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback((newSession: Session) => {
    setSession(newSession);
    storeSession(newSession);
  }, []);

  const logout = useCallback(() => {
    // Disconnect from voice channels by removing audio elements
    document.querySelectorAll('audio[data-lk-audio]').forEach((el) => el.remove());

    setSession(null);
    clearStoredSession();
  }, []);

  const updateSession = useCallback((updates: Partial<Session>) => {
    setSession((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      storeSession(updated);
      return updated;
    });
  }, []);

  // NOTE: Inactivity timeout is handled exclusively by the SessionTimeout
  // component in the app shell. Do NOT add a duplicate timer here.

  const value = useMemo<SessionContextValue>(
    () => ({ session, isLoading, login, logout, updateSession }),
    [session, isLoading, login, logout, updateSession]
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
