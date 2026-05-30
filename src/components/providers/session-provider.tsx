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

  // Restore session from localStorage on mount. If empty, hydrate from the
  // server via /api/auth/me - the hs-session cookie is httpOnly so JS can't
  // detect it directly; let the endpoint decide. Returns 401 if no cookie.
  useEffect(() => {
    let cancelled = false;
    const stored = getStoredSession();
    if (stored) {
      setSession(stored);
      setIsLoading(false);
      return;
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
          // Apply embedded settings if present (mirror license-key login)
          if (data.settings) {
            try {
              if (data.settings.darkMode !== undefined) {
                localStorage.setItem("dark", JSON.stringify(data.settings.darkMode));
              }
              if (data.settings.theme) {
                localStorage.setItem("theme", JSON.stringify(data.settings.theme));
              }
              if (data.settings.font) {
                localStorage.setItem("font", JSON.stringify(data.settings.font));
              }
              if (data.settings.darkModeSchedule) {
                localStorage.setItem(
                  "darkModeSchedule",
                  JSON.stringify(data.settings.darkModeSchedule)
                );
              }
            } catch {
              /* localStorage unavailable */
            }
          }
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
