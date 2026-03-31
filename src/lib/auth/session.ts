/**
 * Session utilities.
 * Cookies are set/cleared by API routes (httpOnly).
 * This module handles the client-side localStorage session.
 */

import type { Session } from "@/types";

const SESSION_KEY = "hs-session-data";

export function getStoredSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;

    // Backfill packageTier for sessions stored before this field existed
    if (!session.packageTier) {
      session.packageTier = "normal";
    }

    // Check expiry
    if (session.expiry && new Date(session.expiry) < new Date()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    return session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function storeSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearStoredSession(): void {
  localStorage.removeItem(SESSION_KEY);
  // Also clear cookies to prevent proxy.ts from redirecting to /login
  document.cookie = "hs-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  document.cookie = "hs-admin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
}
