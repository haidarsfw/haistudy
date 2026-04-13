"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = getStoredSession();
    if (stored) {
      setSession(stored);
    }
    setIsLoading(false);
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

  return (
    <SessionContext.Provider
      value={{ session, isLoading, login, logout, updateSession }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
