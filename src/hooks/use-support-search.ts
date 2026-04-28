"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupportSearchHit } from "@/types";

const DEBOUNCE_MS = 300;

export interface UseSupportSearchResult {
  query: string;
  setQuery: (q: string) => void;
  hits: SupportSearchHit[];
  loading: boolean;
  clear: () => void;
}

/**
 * Debounced search over /api/support/search. Fires on query change after
 * DEBOUNCE_MS idle. Empty query → empty results, no fetch.
 */
export function useSupportSearch(licenseKey: string | null): UseSupportSearchResult {
  const [query, setQueryState] = useState("");
  const [hits, setHits] = useState<SupportSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightRef = useRef<AbortController | null>(null);

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
  }, []);

  const clear = useCallback(() => {
    setQueryState("");
    setHits([]);
    setLoading(false);
  }, []);

  // Reset on conv switch
  useEffect(() => {
    clear();
  }, [licenseKey, clear]);

  // Debounced fetch
  useEffect(() => {
    if (!licenseKey) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (inflightRef.current) inflightRef.current.abort();

    const trimmed = query.trim();
    if (!trimmed) {
      setHits([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const ctrl = new AbortController();
      inflightRef.current = ctrl;
      try {
        const res = await fetch(
          `/api/support/search?licenseKey=${encodeURIComponent(licenseKey)}&q=${encodeURIComponent(trimmed)}`,
          { signal: ctrl.signal }
        );
        if (!res.ok) {
          setHits([]);
          return;
        }
        const data = await res.json();
        setHits((data.hits || []) as SupportSearchHit[]);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setHits([]);
      } finally {
        if (inflightRef.current === ctrl) {
          inflightRef.current = null;
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, licenseKey]);

  return { query, setQuery, hits, loading, clear };
}
