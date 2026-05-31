"use client";

import { useEffect, useState } from "react";
import type { PublicProfile } from "@/types";

// Module-level cache shared across every surface that renders avatars (chat,
// online list, VIP lounge). Keyed by UPPERCASE license key → avatar_url|null.
// Persists for the page lifetime so switching surfaces never refetches.
const cache = new Map<string, string | null>();
// When a key was last resolved to null. Lets us TTL-refetch a key that came
// back empty once but may have an avatar now (fixes "avatar kadang hilang"
// after an upload elsewhere) without spamming the endpoint.
const nullSince = new Map<string, number>();
// In-flight keys so two surfaces mounting at once don't double-fetch the set.
const inFlight = new Set<string>();

const NULL_TTL_MS = 60_000;

function setCache(key: string, url: string | null) {
  cache.set(key, url);
  if (url === null) nullSince.set(key, Date.now());
  else nullSince.delete(key);
}

// A cached null is "stale" once older than the TTL - eligible for one refetch.
function isStaleNull(key: string): boolean {
  if (cache.get(key) !== null) return false;
  const t = nullSince.get(key);
  if (t == null) return false;
  return Date.now() - t > NULL_TTL_MS;
}

// Subscribers re-render every live useAvatars() instance when the cache changes
// out-of-band (e.g. the current user uploads a new avatar → "hs:avatar-updated").
const subscribers = new Set<() => void>();
function notifyAll() {
  subscribers.forEach((fn) => fn());
}

if (typeof window !== "undefined") {
  window.addEventListener("hs:avatar-updated", (e) => {
    const detail = (e as CustomEvent).detail || {};
    const licenseKey: string | undefined = detail.licenseKey;
    const avatarUrl: string | null | undefined = detail.avatarUrl;
    if (licenseKey) {
      setCache(String(licenseKey).toUpperCase(), avatarUrl ?? null);
      notifyAll();
    }
  });
}

function normKeys(keys: (string | null | undefined)[]): string[] {
  return [
    ...new Set(
      keys
        .filter((k): k is string => !!k)
        .map((k) => k.toUpperCase())
    ),
  ];
}

/**
 * Resolve avatar URLs for a set of license keys via the batched
 * /api/profile/public endpoint. Returns a Map(licenseKey → avatar_url|null);
 * a key maps to null when the user has no uploaded avatar (caller falls back
 * to a generated initial avatar). Lightweight: cached cross-surface, one POST
 * per previously-unseen set of keys. Re-renders live when an avatar updates.
 */
export function useAvatars(
  licenseKeys: (string | null | undefined)[]
): Map<string, string | null> {
  const [, force] = useState(0);

  // Subscribe to out-of-band cache updates so an avatar uploaded on another
  // surface repaints this one without a reload.
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    subscribers.add(fn);
    return () => {
      subscribers.delete(fn);
    };
  }, []);

  // Stable dependency: the sorted, de-duped key set.
  const wanted = normKeys(licenseKeys);
  const depKey = wanted.slice().sort().join(",");

  useEffect(() => {
    const need = wanted.filter(
      (k) => (!cache.has(k) || isStaleNull(k)) && !inFlight.has(k)
    );
    if (need.length === 0) return;

    need.forEach((k) => inFlight.add(k));
    let cancelled = false;

    fetch("/api/profile/public", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKeys: need }),
    })
      .then((r) => (r.ok ? r.json() : { profiles: [] }))
      .then((data: { profiles?: PublicProfile[] }) => {
        const returned = new Set<string>();
        for (const p of data.profiles ?? []) {
          const key = p.licenseKey.toUpperCase();
          setCache(key, p.avatarUrl ?? null);
          returned.add(key);
        }
        // Keys the endpoint didn't return (out-of-scope / unknown / no avatar) →
        // null. Refreshes the TTL timestamp so a stale-null retry doesn't spin.
        for (const k of need) if (!returned.has(k)) setCache(k, null);
      })
      .catch(() => {
        // On failure, mark null so a transient error doesn't spin forever.
        for (const k of need) if (!cache.has(k)) setCache(k, null);
      })
      .finally(() => {
        need.forEach((k) => inFlight.delete(k));
        if (!cancelled) force((n) => n + 1);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey]);

  // Build the result map from cache for the requested keys.
  const out = new Map<string, string | null>();
  for (const k of wanted) out.set(k, cache.get(k) ?? null);
  return out;
}
