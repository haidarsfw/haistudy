"use client";

import { useEffect, useState } from "react";

export interface AccountSummary {
  id: string;
  email: string;
  authProvider: "google" | "password";
  emailVerified: boolean;
  fullName: string;
  nickname: string;
  avatarUrl: string | null;
}

export interface AccessSummary {
  hasActive: boolean;
  count: number;
  dashboardPath: string | null;
}

interface State {
  account: AccountSummary | null;
  access: AccessSummary | null;
  loading: boolean;
}

/**
 * Who is signed in at the ACCOUNT layer, for the landing chrome.
 *
 * Separate from `useSession`, which reports the license/access layer. The
 * landing header has to distinguish three states — signed out, signed in with
 * nothing bought, signed in with access — and only this endpoint knows the
 * middle one.
 *
 * Resolved once per mount and shared through a module-level cache, so the
 * header, the hero and anything else asking on the same page make one request
 * between them rather than one each.
 */
let cache: State | null = null;
let inflight: Promise<State> | null = null;
const listeners = new Set<(s: State) => void>();

async function load(): Promise<State> {
  try {
    const res = await fetch("/api/account/me", { credentials: "same-origin" });
    const data = (await res.json()) as {
      account: AccountSummary | null;
      access?: AccessSummary;
    };
    return {
      account: data.account ?? null,
      access: data.access ?? null,
      loading: false,
    };
  } catch {
    // Treated as signed out. The header showing "Masuk" to someone who is
    // actually signed in is a far smaller failure than a broken header.
    return { account: null, access: null, loading: false };
  }
}

/** Drop the cache after signing in or out so the chrome catches up. */
export function refreshAccount(): void {
  cache = null;
  inflight = null;
  void resolve();
}

function resolve(): Promise<State> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = load().then((s) => {
      cache = s;
      inflight = null;
      listeners.forEach((fn) => fn(s));
      return s;
    });
  }
  return inflight;
}

export function useAccount(): State {
  const [state, setState] = useState<State>(
    cache ?? { account: null, access: null, loading: true }
  );

  useEffect(() => {
    let alive = true;
    const listener = (s: State) => {
      if (alive) setState(s);
    };
    listeners.add(listener);
    void resolve().then(listener);
    return () => {
      alive = false;
      listeners.delete(listener);
    };
  }, []);

  return state;
}
