"use client";

import { useEffect, useState } from "react";
import type { PublicProfile } from "@/types";

interface CachedProfile {
  avatarUrl: string | null;
  name: string | null;
}

// Module-level cache shared across every surface that renders avatars and profiles.
// Keyed by UPPERCASE license key → CachedProfile.
// Persists for the page lifetime so switching surfaces never refetches.
const cache = new Map<string, CachedProfile>();
// When a key was last resolved to null. Lets us TTL-refetch a key that came
// back empty once but may have an avatar now (fixes "avatar kadang hilang"
// after an upload elsewhere) without spamming the endpoint.
const nullSince = new Map<string, number>();
// In-flight keys so two surfaces mounting at once don't double-fetch the set.
const inFlight = new Set<string>();

const NULL_TTL_MS = 60_000;

function setCache(key: string, url: string | null, name: string | null = null) {
  const existing = cache.get(key);
  cache.set(key, {
    avatarUrl: url,
    name: name ?? existing?.name ?? null,
  });
  if (url === null) nullSince.set(key, Date.now());
  else nullSince.delete(key);
}

// A cached null is "stale" once older than the TTL - eligible for one refetch.
function isStaleNull(key: string): boolean {
  const entry = cache.get(key);
  if (!entry || entry.avatarUrl !== null) return false;
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
 * Shared profile fetcher to fetch public profiles in batches.
 * Manages deduplication, in-flight tracking, cache updates, and failure cooldowns.
 */
async function fetchProfiles(wantedKeys: string[]) {
  const need = wantedKeys.filter(
    (k) => (!cache.has(k) || isStaleNull(k)) && !inFlight.has(k)
  );
  if (need.length === 0) return;

  need.forEach((k) => inFlight.add(k));

  try {
    const r = await fetch("/api/profile/public", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKeys: need }),
    });
    
    const data: { profiles?: PublicProfile[] } = r.ok ? await r.json() : { profiles: [] };
    const returned = new Set<string>();
    
    for (const p of data.profiles ?? []) {
      const key = p.licenseKey.toUpperCase();
      setCache(key, p.avatarUrl ?? null, p.name);
      returned.add(key);
    }
    
    // Any requested keys not returned are cached as null to prevent infinite retries.
    for (const k of need) {
      if (!returned.has(k)) {
        setCache(k, null);
      }
    }
  } catch (err) {
    console.error("[use-avatars] batch fetch failed", err);
    // On failure, unconditionally update nullSince cooldown to prevent infinite retry loops.
    for (const k of need) {
      const existing = cache.get(k);
      setCache(k, existing?.avatarUrl ?? null, existing?.name ?? null);
    }
  } finally {
    need.forEach((k) => inFlight.delete(k));
    notifyAll();
  }
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

  // Subscribe to cache updates so when cache resolves or updates out-of-band,
  // we paint the new values immediately.
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    subscribers.add(fn);
    return () => {
      subscribers.delete(fn);
    };
  }, []);

  const wanted = normKeys(licenseKeys);
  const depKey = wanted.slice().sort().join(",");

  useEffect(() => {
    fetchProfiles(wanted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey]);

  // Build the result map from cache for the requested keys.
  const out = new Map<string, string | null>();
  for (const k of wanted) {
    out.set(k, cache.get(k)?.avatarUrl ?? null);
  }
  return out;
}

/**
 * Resolve names for a set of license keys via the cached public profile map.
 * Returns a Map(licenseKey → resolvedName|null).
 */
export function useResolvedNames(
  licenseKeys: (string | null | undefined)[]
): Map<string, string | null> {
  const [, force] = useState(0);

  useEffect(() => {
    const fn = () => force((n) => n + 1);
    subscribers.add(fn);
    return () => {
      subscribers.delete(fn);
    };
  }, []);

  const wanted = normKeys(licenseKeys);
  const depKey = wanted.slice().sort().join(",");

  useEffect(() => {
    fetchProfiles(wanted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey]);

  const out = new Map<string, string | null>();
  for (const k of wanted) {
    out.set(k, cache.get(k)?.name ?? null);
  }
  return out;
}
