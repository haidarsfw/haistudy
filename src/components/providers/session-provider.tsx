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

    // FAST PATH — a real (non-preview) stored session. Paint instantly, then
    // reconcile in the background against the httpOnly cookie (source of truth).
    // The reconcile may switch account / scope / upgrade preview→real, but must
    // NEVER silently downgrade a real session to preview: the only way the
    // server reports preview for a key we believe is real is a stale/leftover
    // PREVIEW cookie, and trapping a paying user in preview is the exact bug
    // being fixed. A genuine downgrade still applies on the next fresh login.
    if (stored && !stored.isPreview) {
      setSession(stored);
      setIsLoading(false);
      (async () => {
        try {
          const res = await fetch("/api/auth/me", { credentials: "same-origin" });
          if (!res.ok || cancelled) return;
          const data = await res.json();
          const srv = data.session as Session | undefined;
          if (!srv || cancelled) return;
          const downgradeToPreview = !!srv.isPreview && !stored.isPreview;
          const changed =
            srv.licenseKey !== stored.licenseKey ||
            !!srv.isPreview !== !!stored.isPreview ||
            srv.scopeKey !== stored.scopeKey ||
            srv.loginMethod !== stored.loginMethod;
          if (changed && !downgradeToPreview) {
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

    // SLOW PATH — no stored session, OR a stored PREVIEW session (ambiguous /
    // possibly stale). BLOCK on /api/auth/me before first paint so the cookie
    // decides: a real user whose localStorage still says PREVIEW (tried preview,
    // then logged in with Google — the callback can't write localStorage)
    // renders their REAL session with no preview flash and no "refresh again"
    // loop. Same single fetch as before, just awaited.
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "same-origin" });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          if (data.session) {
            applyEmbeddedSettings(data.settings);
            setSession(data.session);
            storeSession(data.session);
          } else {
            // 200 but no session — drop any stale local copy.
            clearStoredSession();
            setSession(null);
          }
        } else if (res.status === 401) {
          // No/expired cookie → genuinely logged out. Clear the stale PREVIEW
          // localStorage so it can't trap the next visit; AppShell sends to /.
          clearStoredSession();
          setSession(null);
        } else if (stored) {
          // Transient server error (5xx): fall back to the stored session so the
          // user isn't stuck on a spinner. A refresh retries the reconcile.
          setSession(stored);
        }
      } catch {
        // Network error: keep whatever we had (may be a stored preview); refresh retries.
        if (stored) setSession(stored);
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
