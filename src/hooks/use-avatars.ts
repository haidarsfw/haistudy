"use client";

import { useEffect, useState } from "react";
import type { PublicProfile } from "@/types";

// Module-level cache shared across every surface that renders avatars (chat,
// online list, VIP lounge). Keyed by UPPERCASE license key → avatar_url|null.
// Persists for the page lifetime so switching surfaces never refetches.
const cache = new Map<string, string | null>();
// In-flight keys so two surfaces mounting at once don't double-fetch the set.
const inFlight = new Set<string>();

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
 * per previously-unseen set of keys.
 */
export function useAvatars(
  licenseKeys: (string | null | undefined)[]
): Map<string, string | null> {
  const [, force] = useState(0);

  // Stable dependency: the sorted, de-duped key set.
  const wanted = normKeys(licenseKeys);
  const depKey = wanted.slice().sort().join(",");

  useEffect(() => {
    const need = wanted.filter((k) => !cache.has(k) && !inFlight.has(k));
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
        for (const p of data.profiles ?? []) {
          cache.set(p.licenseKey.toUpperCase(), p.avatarUrl ?? null);
        }
        // Keys the endpoint didn't return (out-of-scope / unknown) → null so we
        // don't refetch them forever.
        for (const k of need) if (!cache.has(k)) cache.set(k, null);
      })
      .catch(() => {
        // On failure, mark null so a transient error doesn't spin forever.
        for (const k of need) if (!cache.has(k)) cache.set(k, null);
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
