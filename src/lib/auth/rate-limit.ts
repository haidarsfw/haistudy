/**
 * Client-side login rate limiting.
 * Tracks failed attempts in localStorage with tiered lockouts:
 * - 3 failures → 1 min lockout
 * - 6 failures → 5 min lockout
 * - 9+ failures → 30 min lockout
 */

import { RATE_LIMITS } from "@/lib/constants";

interface RateLimitState {
  attempts: number;
  lockedUntil: number | null;
}

const STORAGE_KEY = "hs-login-rate-limit";

function getState(): RateLimitState {
  if (typeof window === "undefined") return { attempts: 0, lockedUntil: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { attempts: 0, lockedUntil: null };
    return JSON.parse(raw);
  } catch {
    return { attempts: 0, lockedUntil: null };
  }
}

function setState(state: RateLimitState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function checkRateLimit(): {
  allowed: boolean;
  remainingMs: number;
  attempts: number;
} {
  const state = getState();
  const now = Date.now();

  if (state.lockedUntil && state.lockedUntil > now) {
    return {
      allowed: false,
      remainingMs: state.lockedUntil - now,
      attempts: state.attempts,
    };
  }

  // If lockout has expired, allow but keep attempt count
  return { allowed: true, remainingMs: 0, attempts: state.attempts };
}

export function recordFailedAttempt(): {
  locked: boolean;
  lockoutMs: number;
  attempts: number;
} {
  const state = getState();
  state.attempts += 1;

  const max = RATE_LIMITS.LOGIN_MAX_ATTEMPTS;

  let lockoutMs = 0;
  if (state.attempts >= max * 3) {
    lockoutMs = RATE_LIMITS.LOGIN_LOCKOUT_TIER3_MS; // 30 min
  } else if (state.attempts >= max * 2) {
    lockoutMs = RATE_LIMITS.LOGIN_LOCKOUT_TIER2_MS; // 5 min
  } else if (state.attempts >= max) {
    lockoutMs = RATE_LIMITS.LOGIN_LOCKOUT_MS; // 1 min
  }

  if (lockoutMs > 0) {
    state.lockedUntil = Date.now() + lockoutMs;
  }

  setState(state);

  return {
    locked: lockoutMs > 0,
    lockoutMs,
    attempts: state.attempts,
  };
}

export function resetRateLimit(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function formatLockoutTime(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds} detik`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} menit`;
}
