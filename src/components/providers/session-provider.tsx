"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Session } from "@/types";
import {
  getStoredSession,
  storeSession,
  clearStoredSession,
} from "@/lib/auth/session";
import { toast } from "sonner";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 5 * 60 * 1000; // Warning shows 5 min before logout (at 25 min)

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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningShownRef = useRef(false);

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

    // Clear inactivity timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
  }, []);

  const updateSession = useCallback((updates: Partial<Session>) => {
    setSession((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      storeSession(updated);
      return updated;
    });
  }, []);

  // ═══ Inactivity timeout: auto-logout after 30 minutes of no activity ═══
  useEffect(() => {
    if (!session) return; // Only track when logged in

    const resetTimer = () => {
      // Clear existing timers
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      warningShownRef.current = false;

      // Set warning timer (fires 5 min before logout = at 25 min)
      warningRef.current = setTimeout(() => {
        warningShownRef.current = true;
        toast.warning("Kamu akan ter-logout dalam 5 menit karena tidak aktif.", {
          duration: 10000,
          id: "inactivity-warning",
          description: "Gerakkan mouse atau sentuh layar untuk tetap login.",
        });
      }, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS);

      // Set logout timer (fires at 30 min)
      timeoutRef.current = setTimeout(() => {
        toast.error("Sesi berakhir karena tidak aktif selama 30 menit.", {
          duration: 5000,
          id: "inactivity-logout",
        });
        logout();
      }, INACTIVITY_TIMEOUT_MS);
    };

    // Activity events to track
    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    // Debounce: only reset timer every 30 seconds to avoid excessive timer resets
    let lastReset = Date.now();
    const debouncedReset = () => {
      const now = Date.now();
      if (now - lastReset > 30_000) {
        lastReset = now;
        resetTimer();
      }
    };

    // Initialize timer
    resetTimer();

    // Listen for activity
    events.forEach((event) => {
      document.addEventListener(event, debouncedReset, { passive: true });
    });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      events.forEach((event) => {
        document.removeEventListener(event, debouncedReset);
      });
    };
  }, [session, logout]);

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
